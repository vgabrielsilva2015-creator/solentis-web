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

// Operações que tocam linhas e portanto precisam de escopo de tenant
const SCOPED_OPS = [
  'findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany',
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. Coletar todos os arquivos .ts/.tsx de src/
// ─────────────────────────────────────────────────────────────────────────────
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue
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

      // Exceção auditada: linha anterior contém // @tenant-safe: <motivo>
      // Usado APENAS para jobs de sistema que varrem todos os tenants de propósito.
      const lineNum = text.slice(0, m.index).split('\n').length
      const prevLines = text.split('\n').slice(Math.max(0, lineNum - 4), lineNum - 1).join('\n')
      if (/@tenant-safe:/.test(prevLines)) continue

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
})
