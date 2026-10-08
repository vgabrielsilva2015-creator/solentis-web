/**
 * TESTE DE ISOLAMENTO MULTI-TENANT (guardião de segurança)
 *
 * Este teste é uma APÓLICE DE SEGURO. Ele varre TODO o código-fonte e falha o build
 * se encontrar qualquer query Prisma que leia/escreva dados de um modelo com tenant_id
 * SEM filtrar por tenant. É a barreira que impede que uma feature futura (Wave 2+)
 * reintroduza vazamento entre plantas sem ninguém perceber.
 *
 * Plantas são empresas distintas (CNPJs diferentes). Vazamento aqui = incidente LGPD.
 * Por isso este teste trata qualquer query não-isolada como FALHA, não aviso.
 *
 * Como funciona: análise estática (não precisa de banco). Para cada chamada
 * prisma.MODELO.OP(...) ou tx.MODELO.OP(...), verifica se o bloco de argumentos
 * referencia tenant_id, OU usa uma PK composta de isolamento (tenant_id_*),
 * OU usa uma variável `where` que é comprovadamente montada com tenant_id.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Descobrir quais modelos têm tenant_id (lendo o schema, fonte da verdade)
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf-8')

function modelsWithTenant(): Set<string> {
  const set = new Set<string>()
  const re = /model\s+(\w+)\s*\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(SCHEMA))) {
    if (/\btenant_id\b/.test(m[2])) set.add(m[1])
  }
  return set
}

// Delegate do Prisma Client = nome do model com a 1ª letra minúscula
const toDelegate = (model: string) => model[0].toLowerCase() + model.slice(1)
const TENANT_MODELS = modelsWithTenant()

// Detecta se User.email é único GLOBAL (@unique na linha do campo email).
// Quando é global, buscar usuário por email é inequívoco (1 email = 1 conta),
// portanto queries de User filtradas por email são seguras mesmo sem tenant_id.
function userEmailIsGloballyUnique(): boolean {
  const userModel = /model\s+User\s*\{([^}]+)\}/.exec(SCHEMA)
  if (!userModel) return false
  // procura a linha do campo email com @unique (mas não @@unique composto)
  return /\n\s*email\s+\S+.*@unique/.test(userModel[1])
}
const USER_EMAIL_GLOBAL = userEmailIsGloballyUnique()
const TENANT_DELEGATES = new Set([...TENANT_MODELS].map(toDelegate))

// Operações que tocam linhas e portanto precisam de escopo de tenant.
// Inclui ESCRITAS (create/update/upsert/delete): foi por não cobrir escrita que
// o IDOR de comentário passou batido. Uma escrita conta como isolada se o bloco
// referencia tenant_id (ex.: create com `data: { tenant_id }`), usa PK composta
// (tenant_id_*), OU tem o selo auditado `// @tenant-checked` na linha anterior
// (para check-then-act via relação em modelos sem tenant_id próprio).
const SCOPED_OPS = [
  'findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy',
  'create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany',
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. Coletar todos os arquivos .ts/.tsx de src/
// ─────────────────────────────────────────────────────────────────────────────
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue
      // src/test = apoio dos testes de integração (T-28): faz TRUNCATE de propósito; o teste
      // 'nenhum código de produção importa src/test' (t28-apoio-de-teste.test.ts) fecha essa porta.
      if (entry === 'test' && dir.replace(/\\/g, '/').endsWith('/src')) continue
      walk(full, acc)
    } else if (/\.tsx?$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}
const FILES = walk(join(process.cwd(), 'src'))

// ─────────────────────────────────────────────────────────────────────────────
// 3. Extrair o bloco de argumentos balanceado de uma chamada
// ─────────────────────────────────────────────────────────────────────────────
function extractArgs(text: string, openParenIdx: number): string {
  let depth = 1
  let i = openParenIdx + 1
  while (i < text.length && depth > 0) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    i++
  }
  return text.slice(openParenIdx + 1, i - 1)
}

// Uma query está "isolada" se o bloco referencia tenant_id diretamente,
// OU usa PK composta de isolamento (tenant_id_email, tenant_id_severity, etc.)
function blockIsIsolated(block: string): boolean {
  if (/\btenant_id\b/.test(block)) return true
  if (/tenant_id_\w+/.test(block)) return true
  return false
}

// Detecta se a query usa uma variável `where` (ex.: `{ where, include: ... }` ou `{ where: where }`)
// Nesses casos, validamos separadamente que a variável foi montada com tenant.
function usesWhereVariable(block: string): boolean {
  // `where,` ou `where }` ou `where:where`  (variável, não objeto literal inline)
  return /\bwhere\s*,/.test(block) || /\bwhere\s*\}/.test(block) || /where:\s*where\b/.test(block)
}

// Para um arquivo, confirma que TODA variável `const where`/`let where` inclui tenant_id
function whereVarsAreScoped(fileText: string): boolean {
  const decls = [...fileText.matchAll(/(?:const|let)\s+where(?::\s*[^=]+)?\s*=\s*\{/g)]
  if (decls.length === 0) return false
  for (const d of decls) {
    // pega ~500 chars a partir da declaração e exige tenant_id
    const seg = fileText.slice(d.index!, d.index! + 500)
    if (!/\btenant_id\b/.test(seg)) return false
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Varredura principal
// ─────────────────────────────────────────────────────────────────────────────
interface Violation {
  file: string
  line: number
  delegate: string
  op: string
  snippet: string
}

function scan(): Violation[] {
  const violations: Violation[] = []
  const callRe = new RegExp(
    `(?:prisma|tx)\\.(\\w+)\\.(${SCOPED_OPS.join('|')})\\s*\\(`,
    'g',
  )

  for (const file of FILES) {
    const text = readFileSync(file, 'utf-8')
    let m: RegExpExecArray | null
    callRe.lastIndex = 0
    while ((m = callRe.exec(text))) {
      const delegate = m[1]
      const op = m[2]
      if (!TENANT_DELEGATES.has(delegate)) continue // modelo sem tenant: fora de escopo

      const openParen = m.index + m[0].length - 1
      const block = extractArgs(text, openParen)

      if (blockIsIsolated(block)) continue // tem tenant_id inline ou PK composta: OK

      // User filtrado por email + email único global = inequívoco (1 email = 1 conta)
      if (delegate === 'user' && USER_EMAIL_GLOBAL && /\bemail\b/.test(block)) continue

      // Se usa variável `where`, validar que TODAS as where-vars do arquivo têm tenant
      if (usesWhereVariable(block) && whereVarsAreScoped(text)) continue

      // Exceções auditadas nas linhas imediatamente acima da query:
      //  • @tenant-safe:    job de sistema que varre todos os tenants de propósito.
      //  • @tenant-checked: escrita em modelo sem tenant_id próprio (ex.: comentário),
      //    cujo isolamento é garantido por um check-then-act via relação logo acima.
      const lineNum = text.slice(0, m.index).split('\n').length
      const prevLines = text.split('\n').slice(Math.max(0, lineNum - 4), lineNum - 1).join('\n')
      if (/@tenant-safe:/.test(prevLines) || /@tenant-checked/.test(prevLines)) continue

      // Caso contrário: VIOLAÇÃO
      const line = lineNum
      violations.push({
        file: file.replace(process.cwd() + '\\', '').replace(/\\/g, '/'),
        line,
        delegate,
        op,
        snippet: block.replace(/\s+/g, ' ').trim().slice(0, 80),
      })
    }
  }
  return violations
}

// ─────────────────────────────────────────────────────────────────────────────
// 4b. T-05 — tenant_id precisa estar no FILTRO, não em qualquer lugar do bloco
// ─────────────────────────────────────────────────────────────────────────────
// Antes, `findFirst({ where: { id }, select: { tenant_id: true } })` passava porque
// "tenant_id" aparecia no select. Agora, quando a chamada tem `where: { ... }`
// literal, o tenant_id (ou a PK composta tenant_id_*) tem que estar DENTRO dele.
const WHERE_OPS = new Set([
  'findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy',
  'update', 'updateMany', 'upsert', 'delete', 'deleteMany',
])

/** Objeto balanceado `{...}` que começa em `openIdx`. */
function balancedObject(text: string, openIdx: number): string {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(openIdx, i + 1) }
  }
  return text.slice(openIdx)
}

/** `where: { ... }` literal no nível de topo do bloco (ignora where de include/select). */
function literalWhere(block: string): string | null {
  const re = /\bwhere\s*:\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(block))) {
    // profundidade de chaves antes do match: o objeto de argumentos é a 1ª chave
    let depth = 0
    for (let i = 0; i < m.index; i++) {
      if (block[i] === '{') depth++
      else if (block[i] === '}') depth--
    }
    if (depth === 1) return balancedObject(block, m.index + m[0].length - 1)
  }
  return null
}

function prevLinesOf(text: string, idx: number): string {
  const lineNum = text.slice(0, idx).split('\n').length
  return text.split('\n').slice(Math.max(0, lineNum - 4), lineNum - 1).join('\n')
}

function scanWhereScope(file: string, text: string): Violation[] {
  const out: Violation[] = []
  const re = new RegExp(`(?:prisma|tx)\\.(\\w+)\\.(${[...WHERE_OPS].join('|')})\\s*\\(`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const [, delegate, op] = m
    if (!TENANT_DELEGATES.has(delegate)) continue
    const block = extractArgs(text, m.index + m[0].length - 1)
    const where = literalWhere(block)
    if (!where) continue // sem where literal: regra antiga (variável where etc.) já cobre
    if (/\btenant_id\b/.test(where)) continue
    if (delegate === 'user' && USER_EMAIL_GLOBAL && /\bemail\b/.test(where)) continue
    const prev = prevLinesOf(text, m.index)
    if (/@tenant-safe:/.test(prev) || /@tenant-checked/.test(prev)) continue
    out.push({
      file, line: text.slice(0, m.index).split('\n').length, delegate, op,
      snippet: where.replace(/\s+/g, ' ').slice(0, 80),
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 4c. T-05 — FK vinda do cliente precisa ter a posse conferida antes da escrita
// ─────────────────────────────────────────────────────────────────────────────
// As FKs do banco são globais. Gravar `collection_point_id: parsed.data.x` sem
// conferir que o ponto é da mesma planta permite referenciar dado de outro tenant.
//
// Regra (heurística estática, por função):
//  - FK = coluna com @relation(fields: [...]) apontando para um modelo com tenant_id;
//  - valor "do cliente" = parsed.data.*, formData.get(...), parâmetro da função,
//    ou variável local inicializada a partir deles;
//  - conferido = antes da escrita, na mesma função, existe checkOwnership/assertOwned
//    com `id: <valor>`, ou uma consulta com `id: <valor>` e tenant_id no mesmo bloco.
// Limite conhecido: valores vindos de laço sobre dados do cliente (ex.: `r.parameterId`
// no import de laudos) não são classificados como "do cliente".

/** modelo -> (coluna FK -> modelo alvo), só para alvos com tenant_id */
function foreignKeys(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()
  const re = /model\s+(\w+)\s*\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(SCHEMA))) {
    const cols = new Map<string, string>()
    for (const line of m[2].split('\n')) {
      const r = /^\s*\w+\s+(\w+)\??\s+.*@relation\([^)]*fields:\s*\[([^\]]+)\]/.exec(line)
      if (!r || !TENANT_MODELS.has(r[1])) continue
      for (const col of r[2].split(',').map((c) => c.trim())) {
        if (col !== 'tenant_id') cols.set(col, r[1])
      }
    }
    if (cols.size) out.set(toDelegate(m[1]), cols)
  }
  return out
}
const FKS = foreignKeys()
const WRITE_OPS = ['create', 'createMany', 'update', 'updateMany', 'upsert']

/** Início da função que contém `idx` + nomes dos parâmetros. */
function enclosingFunction(text: string, idx: number): { start: number; params: Set<string> } {
  // Só parâmetros de server actions exportadas ('use server') vêm do cliente;
  // funções internas de src/lib recebem valores já resolvidos no servidor.
  const isServerActionFile = /^\s*['"]use server['"]/.test(text)
  const re = /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g
  let last: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) && m.index < idx) last = m
  if (!last) return { start: 0, params: new Set() }
  if (!isServerActionFile || !/^export\b/.test(last[0])) return { start: last.index, params: new Set() }
  const sig = extractArgs(text, last.index + last[0].length - 1)
  const params = new Set<string>()
  // nomes no nível de topo da assinatura: `nome:` ou `nome,` ou `nome)`
  let depth = 0, cur = ''
  for (const c of sig + ',') {
    if ('({<['.includes(c)) depth++
    if (')}>]'.includes(c)) depth--
    if (c === ',' && depth === 0) {
      const name = /^\s*(\w+)/.exec(cur)?.[1]
      if (name && !['_prev', 'prev', 'formData', '_state'].includes(name)) params.add(name)
      cur = ''
    } else cur += c
  }
  return { start: last.index, params }
}

/** Expressão principal de um valor: `parsed.data.x || null` -> `parsed.data.x`. */
function coreExpr(value: string): string | null {
  const v = value.trim().replace(/^String\(/, '').replace(/^\(+/, '')
  return /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*/.exec(v)?.[0] ?? null
}

function isClientDerived(expr: string, fnText: string, params: Set<string>): boolean {
  if (/^parsed\.data\./.test(expr) || /formData\.get/.test(expr)) return true
  const root = expr.split('.')[0]
  if (params.has(root)) return true
  const esc = root.replace(/[$]/g, '\\$')
  // const x = parsed.data.y / formData.get(...) / String(formData.get(...))
  if (new RegExp(`(?:const|let)\\s+${esc}\\b[^=\\n]*=\\s*(?:String\\(\\s*)?(?:parsed\\.data|formData\\.get)`).test(fnText)) return true
  // const { x, ... } = parsed.data
  if (new RegExp(`(?:const|let)\\s*\\{[^}]*\\b${esc}\\b[^}]*\\}\\s*=\\s*parsed\\.data`).test(fnText)) return true
  return false
}

function ownershipVerified(expr: string, before: string): boolean {
  const esc = expr.replace(/[.$]/g, (c) => '\\' + c)
  const idRe = new RegExp(`\\bid\\s*:\\s*${esc}(?![\\w$.])`)
  // checkOwnership / assertOwned com id: <expr>
  const ownRe = /\b(?:checkOwnership|assertOwned)\s*\(/g
  let m: RegExpExecArray | null
  while ((m = ownRe.exec(before))) {
    if (idRe.test(extractArgs(before, m.index + m[0].length - 1))) return true
  }
  // consulta com id: <expr> e tenant_id no mesmo bloco
  const qRe = /(?:prisma|tx)\.\w+\.(?:findFirst|findUnique|findMany|count)\s*\(/g
  while ((m = qRe.exec(before))) {
    const blk = extractArgs(before, m.index + m[0].length - 1)
    if (idRe.test(blk) && /\btenant_id\b/.test(blk)) return true
  }
  return false
}

/** Remove os objetos `where: {...}` do bloco (filtros não são gravação). */
function withoutWhere(block: string): string {
  let out = block
  for (let w = literalWhere(out); w; w = literalWhere(out)) out = out.replace(w, '{}').replace(/\bwhere\s*:/, 'w_:')
  return out
}

function scanClientForeignKeys(file: string, text: string): Violation[] {
  const out: Violation[] = []
  const re = new RegExp(`(?:prisma|tx)\\.(\\w+)\\.(${WRITE_OPS.join('|')})\\s*\\(`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const [, delegate, op] = m
    const fks = FKS.get(delegate)
    if (!fks) continue
    const block = withoutWhere(extractArgs(text, m.index + m[0].length - 1))
    const { start, params } = enclosingFunction(text, m.index)
    const fnText = text.slice(start, m.index)
    const prev = prevLinesOf(text, m.index)
    if (/@tenant-safe:/.test(prev)) continue
    for (const col of fks.keys()) {
      const assign = new RegExp(`\\b${col}\\s*:\\s*([^,\\n}]+)`).exec(block)
      const shorthand = new RegExp(`(?:^|[{,\\s])${col}\\s*(?:,|\\n|\\})`).test(block) && !assign
      const expr = assign ? coreExpr(assign[1]) : shorthand ? col : null
      if (!expr || !isClientDerived(expr, fnText, params)) continue
      if (ownershipVerified(expr, fnText)) continue
      out.push({
        file, line: text.slice(0, m.index).split('\n').length, delegate, op,
        snippet: `${col} = ${expr} (posse não conferida)`,
      })
    }
  }
  return out
}

function scanAll(fn: (file: string, text: string) => Violation[]): Violation[] {
  return FILES.flatMap((f) =>
    fn(f.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', '').replace(/\\/g, '/'), readFileSync(f, 'utf-8')))
}

function report(title: string, vs: Violation[]): string {
  return `\n\n🚨 ${title} — ${vs.length}:\n\n` +
    vs.map((v) => `  ❌ ${v.file}:${v.line}  ${v.delegate}.${v.op}()  →  ${v.snippet}`).join('\n') + '\n'
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Os testes
// ─────────────────────────────────────────────────────────────────────────────
describe('isolamento multi-tenant — guardião de segurança', () => {
  it('o schema deve ter modelos com tenant_id (sanity check)', () => {
    expect(TENANT_MODELS.size).toBeGreaterThan(20)
  })

  it('deve haver arquivos de código para auditar (sanity check)', () => {
    expect(FILES.length).toBeGreaterThan(50)
  })

  it('NENHUMA query pode ler/escrever modelo com tenant_id sem filtrar por tenant', () => {
    const violations = scan()
    if (violations.length > 0) {
      const report = violations
          .map(v => `  ❌ ${v.file}:${v.line}  ${v.delegate}.${v.op}()  →  { ${v.snippet} }`)
          .join('\n')
      throw new Error(
          `\n\n🚨 VAZAMENTO DE TENANT DETECTADO — ${violations.length} query(s) sem isolamento:\n\n${report}\n\n` +
          `Cada query acima lê/escreve dados de um modelo com tenant_id mas NÃO filtra por tenant.\n` +
          `Isso permite que uma planta acesse dados de outra (incidente LGPD).\n` +
          `Corrija adicionando 'tenant_id' ao where, ou usando a PK composta (tenant_id_*).\n`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('tenant_id deve estar DENTRO do where (não basta aparecer no select)', () => {
    const vs = scanAll(scanWhereScope)
    if (vs.length) throw new Error(report('FILTRO SEM TENANT', vs))
    expect(vs).toHaveLength(0)
  })

  it('toda FK gravada a partir de entrada do cliente tem a posse conferida (T-05)', () => {
    const vs = scanAll(scanClientForeignKeys)
    if (vs.length) {
      throw new Error(report('REFERÊNCIA CROSS-TENANT POSSÍVEL', vs) +
        `\nUse checkOwnership/assertOwned (src/lib/ownership.ts) antes da escrita.\n`)
    }
    expect(vs).toHaveLength(0)
  })

  it('nenhum tenant_id literal em código de aplicação', () => {
    const vs = FILES.filter((f) => /tenant_id\s*:\s*['"`]/.test(readFileSync(f, 'utf-8')))
    expect(vs).toEqual([])
  })

  it('SQL cru ($queryRaw/$executeRaw) sempre filtra por tenant_id', () => {
    const vs: string[] = []
    for (const f of FILES) {
      const text = readFileSync(f, 'utf-8')
      const re = /\$(?:queryRaw|executeRaw)(?:Unsafe)?\s*(?:<[^>]*>)?\s*\(/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text))) {
        const blk = extractArgs(text, m.index + m[0].length - 1)
        if (!/\btenant_id\b/.test(blk) && !/@tenant-safe:/.test(prevLinesOf(text, m.index))) {
          vs.push(`${f}:${text.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(vs).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Autoteste do guardião: ele precisa ACHAR os casos ruins
// ─────────────────────────────────────────────────────────────────────────────
describe('guardião — autoteste com código de exemplo', () => {
  const RUIM = `'use server'
export async function registrar(_prev: S, formData: FormData) {
  const parsed = Schema.safeParse({ collection_point_id: formData.get('collection_point_id') })
  const tenantId = await getTenantId()
  await prisma.analysis.create({ data: { tenant_id: tenantId, collection_point_id: parsed.data.collection_point_id } })
}
export async function contar(_prev: S, formData: FormData) {
  const { product_id } = parsed.data
  await prisma.chemicalStockCount.create({ data: { tenant_id: t, product_id, recorded_by } })
}
export async function corretiva(equipamentoId: string) {
  await prisma.correctiveMaintenance.create({ data: { tenant_id: t, equipment_id: equipamentoId } })
}
export async function vaza(id: string) {
  return prisma.equipment.findFirst({ where: { id }, select: { tenant_id: true } })
}`
  const BOM = `'use server'
export async function registrar(_prev: S, formData: FormData) {
  const tenantId = await getTenantId()
  const erro = await checkOwnership(tenantId, [{ model: 'collectionPoint', id: parsed.data.collection_point_id }])
  if (erro) return { error: erro }
  await prisma.analysis.create({ data: { tenant_id: tenantId, collection_point_id: parsed.data.collection_point_id } })
}
export async function corretiva(equipamentoId: string) {
  const eq = await prisma.equipment.findFirst({ where: { id: equipamentoId, tenant_id: t } })
  await prisma.correctiveMaintenance.create({ data: { tenant_id: t, equipment_id: equipamentoId } })
}
export async function servidor() {
  const created = await prisma.shift.findFirst({ where: { tenant_id: t } })
  await prisma.shiftInstance.create({ data: { tenant_id: t, shift_id: created.id } })
}`

  it('detecta FK do cliente sem conferência (campo, atalho e parâmetro)', () => {
    const vs = scanClientForeignKeys('exemplo.ts', RUIM)
    expect(vs.map((v) => v.snippet.split(' ')[0])).toEqual(['collection_point_id', 'product_id', 'equipment_id'])
  })

  it('detecta tenant_id fora do where', () => {
    expect(scanWhereScope('exemplo.ts', RUIM)).toHaveLength(1)
  })

  it('aceita checkOwnership, findFirst com tenant e valores do servidor', () => {
    expect(scanClientForeignKeys('exemplo.ts', BOM)).toEqual([])
  })
})
