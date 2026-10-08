/**
 * T-20 — matriz de permissões e guard único.
 *
 * 1. Toda server action exportada passa pelo guard (`requirePermission` ou
 *    `getActor` + `permissionError`) com uma permissão que existe — exceto as
 *    públicas (login, recuperar senha) e as que só exigem estar logado.
 * 2. Não existe guard local (`async function require*`) nem comparação de perfil
 *    na mão (`session.user.role`) em arquivo de actions.
 * 3. Quem pode cada action hoje = quem podia antes da T-20 (fixture congelada),
 *    menos as mudanças de propósito listadas em MUDANCAS. Ao mudar a matriz
 *    (decisões do dono), atualize MUDANCAS: o teste mostra exatamente o que mudou.
 * 4. O guard em si: sem sessão → /login; usuário desativado → /login; sem
 *    permissão → /acesso-negado; o perfil vem do banco, não do token.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, relative } from 'path'
import { PERMISSIONS, can, type Permission } from '@/server/auth/permissions'

const SRC = join(process.cwd(), 'src')
const BEFORE: Record<string, string | string[]> = JSON.parse(
  readFileSync(join(SRC, 'lib/__tests__/fixtures/permissions-before-t20.json'), 'utf-8'),
)

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(full, acc) }
    else if (/\.ts$/.test(e)) acc.push(full)
  }
  return acc
}
const SERVER_FILES = walk(SRC).filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf-8')))

/**
 * Corpo de cada função exportada (parênteses e chaves balanceados, pulando o tipo de retorno).
 * T-30: uma action pode ser um invólucro de medição — `export async function X(...args) { return
 * medir('X', () => XImpl(...args)) }`. Nesse caso o corpo avaliado é o de `XImpl` (onde está o
 * guard), então o guardião continua exigindo permissão na lógica real e não no invólucro.
 */
function actions(file: string): Array<{ name: string; body: string }> {
  const s = readFileSync(file, 'utf-8')
  const todas = new Map<string, { exportada: boolean; body: string }>()
  for (const m of s.matchAll(/^(export )?async function (\w+)\s*\(/gm)) {
    let k = m.index! + m[0].length, d = 1
    while (d) { if (s[k] === '(') d++; else if (s[k] === ')') d--; k++ }
    let a = 0
    while (!(s[k] === '{' && a === 0)) { if (s[k] === '<') a++; else if (s[k] === '>') a--; k++ }
    const i = k; d = 1; k++
    while (d) { if (s[k] === '{') d++; else if (s[k] === '}') d--; k++ }
    todas.set(m[2], { exportada: !!m[1], body: s.slice(i, k) })
  }
  const out: Array<{ name: string; body: string }> = []
  for (const [name, f] of todas) {
    if (!f.exportada) continue
    const inv = /medir\('(\w+)',\s*\(\)\s*=>\s*(\w+)\(\.\.\.args\)\)/.exec(f.body)
    if (inv && inv[1] === name && todas.has(inv[2]) && inv[2] === `${name}Impl`) {
      out.push({ name, body: todas.get(inv[2])!.body })
    } else {
      out.push({ name, body: f.body })
    }
  }
  return out
}

const PUBLICAS = new Set(['(auth)/actions.ts#sendPasswordResetLink', '(auth)/actions.ts#resetPassword', '(auth)/login/actions.ts#loginAction'])
const SO_LOGADO = new Set([
  '(auth)/trocar-senha/actions.ts#trocarSenhaAction', 'actions/notifications.ts#getNotifications',
  'components/sign-out-action.ts#handleSignOut', 'lib/push-actions.ts#subscribeUser', 'lib/push-actions.ts#unsubscribeUser',
])

const chave = (file: string, name: string) =>
  `${relative(SRC, file).replace(/\\/g, '/').replace(/^app\//, '')}#${name}`

/** Permissão principal de cada action (a primeira chamada ao guard). */
function permissaoDe(body: string): Permission | null {
  const m = /(?:requirePermission\(|permissionError\(ctx,\s*)'([\w.]+)'/.exec(body)
  return m ? (m[1] as Permission) : null
}

const ATUAL = new Map<string, Permission | null>()
for (const f of SERVER_FILES) for (const a of actions(f)) ATUAL.set(chave(f, a.name), permissaoDe(a.body))

describe('toda action passa pelo guard único', () => {
  it('encontrou as actions do app', () => expect(ATUAL.size).toBeGreaterThan(80))

  it('controle negativo (T-30): invólucro de medição não esconde um Impl sem guard', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guard-'))
    const f = join(dir, 'a.ts')
    writeFileSync(f, [
      "'use server'",
      'async function xImpl(a: string) {',
      '  return prisma.thing.findMany({})',
      '}',
      'export async function x(...args: Parameters<typeof xImpl>) {',
      "  return medir('x', () => xImpl(...args))",
      '}',
      'async function yImpl() {',
      "  const ctx = await requirePermission('reading.create')",
      '  return ctx',
      '}',
      'export async function y(...args: Parameters<typeof yImpl>) {',
      "  return medir('y', () => yImpl(...args))",
      '}',
    ].join('\n'))
    const r = actions(f)
    expect(r.map((a) => a.name)).toEqual(['x', 'y'])
    expect(permissaoDe(r[0].body)).toBeNull()            // sem guard → o teste de cobertura falharia
    expect(permissaoDe(r[1].body)).toBe('reading.create') // com guard → reconhecido pelo nome público
  })

  it('cada action protegida chama requirePermission/permissionError com permissão existente', () => {
    const sem: string[] = []
    for (const [k, p] of ATUAL) {
      if (PUBLICAS.has(k) || SO_LOGADO.has(k)) continue
      if (!p || !(p in PERMISSIONS)) sem.push(`${k} -> ${p}`)
    }
    expect(sem).toEqual([])
  })

  it('o guard vem antes de qualquer acesso ao banco', () => {
    const tarde: string[] = []
    for (const f of SERVER_FILES) for (const a of actions(f)) {
      const k = chave(f, a.name)
      if (PUBLICAS.has(k) || SO_LOGADO.has(k)) continue
      const g = a.body.search(/requirePermission\(|getActor\(\)/)
      const db = a.body.search(/\b(prisma|tx)\.\w+\.\w+\(/)
      if (g < 0 || (db >= 0 && db < g)) tarde.push(k)
    }
    expect(tarde).toEqual([])
  })

  it('não sobrou guard local nem comparação de perfil na mão', () => {
    const achados: string[] = []
    for (const f of walk(SRC)) {
      if (f.includes(join('server', 'auth'))) continue
      const t = readFileSync(f, 'utf-8')
      if (/async function require\w*\(/.test(t)) achados.push(`${relative(SRC, f)}: guard local`)
      if (SERVER_FILES.includes(f) && /session\.user\.role\s*(!==|===)|\.includes\(session\.user\.role\)/.test(t)) {
        achados.push(`${relative(SRC, f)}: compara perfil`)
      }
    }
    expect(achados).toEqual([])
  })
})

describe('quem pode cada action: igual a antes da T-20, menos as mudanças listadas', () => {
  // Mudanças de propósito. Cada uma: antes → depois, e o motivo.
  const MUDANCAS: Record<string, { de: string | string[]; para: string[]; motivo: string }> = {
    'gestor/dashboard/actions.ts#obterDetalhesPonto': {
      de: 'LOGADO', para: ['MANAGER'],
      motivo: 'detalhes do painel do gestor abriam para qualquer perfil logado',
    },
    'tecnico/ocorrencias/actions.ts#resolverOcorrencia': {
      de: ['MANAGER', 'TECHNICIAN'], para: ['MANAGER', 'OPERATOR', 'TECHNICIAN'],
      motivo: 'virou o único "Resolver" das três telas (decisão 2: o operador resolve, sempre com a ação registrada)',
    },
    // Decisões do dono do produto, 08/10/2026
    'operador/estoque/actions.ts#registrarSaida': {
      de: ['OPERATOR', 'TECHNICIAN'], para: ['MANAGER', 'OPERATOR', 'TECHNICIAN'], motivo: 'decisão 1: gestor altera estoque',
    },
    'operador/estoque/actions.ts#registrarContagem': {
      de: ['OPERATOR', 'TECHNICIAN'], para: ['MANAGER', 'OPERATOR', 'TECHNICIAN'], motivo: 'decisão 1: gestor altera estoque',
    },
    'operador/ocorrencias/actions.ts#registrarOcorrencia': {
      de: ['MANAGER', 'OPERATOR', 'TECHNICIAN'], para: ['MAINTENANCE', 'MANAGER', 'OPERATOR', 'TECHNICIAN'], motivo: 'decisão 3: manutenção registra',
    },
    'operador/ocorrencias/actions.ts#addOccurrenceComment': {
      de: ['MANAGER', 'OPERATOR', 'TECHNICIAN'], para: ['MAINTENANCE', 'MANAGER', 'OPERATOR', 'TECHNICIAN'], motivo: 'decisão 3: manutenção registra e comenta',
    },
  }
  // Actions que deixaram de existir (o caminho passou para outra action)
  const REMOVIDAS: Record<string, string> = {
    'operador/ocorrencias/actions.ts#resolverOcorrencia': 'tela do operador usa tecnico/ocorrencias#resolverOcorrencia (aceitava nota vazia)',
    'lib/push-actions.ts#sendPushToRole': 'T-21 (V-11): era endpoint público sem login; virou função de servidor em lib/push-service.ts',
    'lib/push-actions.ts#sendPushToUsers': 'T-21 (V-11): idem, em lib/push-service.ts',
  }

  const esperado = (k: string) => (k in MUDANCAS ? MUDANCAS[k].para : BEFORE[k])
  const agora = (k: string): string | string[] => {
    if (PUBLICAS.has(k)) return 'PUBLICO'
    if (SO_LOGADO.has(k)) return 'LOGADO'
    const p = ATUAL.get(k)
    return p ? [...PERMISSIONS[p]].sort() : 'SEM GUARD'
  }

  const VIGENTES = Object.keys(BEFORE).filter((k) => !(k in REMOVIDAS)).sort()

  it('o conjunto de actions é o mesmo (menos as removidas de propósito)', () => {
    expect([...ATUAL.keys()].sort()).toEqual(VIGENTES)
  })

  it.each(VIGENTES)('%s', (k) => {
    expect(agora(k)).toEqual(esperado(k))
  })

  it('validar OS continua só do gestor (regra dentro de atualizarStatusCorretiva)', () => {
    const corpo = actions(join(SRC, 'app/tecnico/equipamentos/actions.ts')).find((a) => a.name === 'atualizarStatusCorretiva')!.body
    expect(corpo).toMatch(/status === 'VALIDATED' && permissionError\(ctx, 'maintenance\.validate'\)/)
    expect(PERMISSIONS['maintenance.validate']).toEqual(['MANAGER'])
  })

  it('arrastar para "Resolvida" no kanban exige a permissão de resolver', () => {
    const corpo = actions(join(SRC, 'app/operador/ocorrencias/actions.ts')).find((a) => a.name === 'updateOccurrenceStatus')!.body
    // resolver e reabrir pelo kanban: permissão de resolver + o caminho único de resolução
    expect(corpo).toMatch(/if \(newStatus === 'RESOLVED'\) \{[\s\S]*?requirePermission\('occurrence\.resolve'\)[\s\S]*?resolverOcorrencia\(permCtx, occurrenceId, notes, null, 'kanban'\)/)
    expect(corpo).toMatch(/occurrence\.status === 'RESOLVED'\) \{[\s\S]*?requirePermission\('occurrence\.resolve'\)[\s\S]*?reabrirOcorrencia/)
    expect(corpo).not.toMatch(/Resolvido via painel Kanban/)
  })
})

describe('matriz', () => {
  it('SUPER_ADMIN não opera planta, só a plataforma', () => {
    const dele = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can('SUPER_ADMIN', p))
    expect(dele).toEqual(['platform.admin'])
  })
  it('perfil desconhecido ou vazio não pode nada', () => {
    for (const p of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can('ADMIN', p)).toBe(false)
      expect(can(undefined, p)).toBe(false)
    }
  })
  it('toda permissão da matriz é usada por alguma action ou rota', () => {
    const usadas = new Set([...ATUAL.values()].filter(Boolean))
    const codigo = walk(SRC).map((f) => readFileSync(f, 'utf-8')).join('\n')
    const soltas = (Object.keys(PERMISSIONS) as Permission[]).filter((p) => !usadas.has(p) && !codigo.includes(`'${p}'`))
    expect(soltas).toEqual([])
  })
})

// ─── Guard em execução (auth e banco simulados) ─────────────────────────────
const authMock = vi.fn()
const findFirst = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: (a: unknown) => findFirst(a) } } }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`) } }))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

describe('guard em execução', async () => {
  const { getActor, requirePermission, permissionError } = await import('@/server/auth/guards')
  const sessao = { user: { id: 'u1', tenantId: 'A', role: 'MANAGER', email: 'g@a' } }
  beforeEach(() => { authMock.mockReset(); findFirst.mockReset() })

  it('sem sessão vai para o login', async () => {
    authMock.mockResolvedValue(null)
    await expect(getActor()).rejects.toThrow('REDIRECT:/login')
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('usuário desativado ou de outra planta vai para o login (consulta filtra planta, ativo e não apagado)', async () => {
    authMock.mockResolvedValue(sessao)
    findFirst.mockResolvedValue(null)
    await expect(getActor()).rejects.toThrow('REDIRECT:/login')
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1', tenant_id: 'A', is_active: true, deleted_at: null },
    }))
  })

  it('o perfil vem do banco: token diz gestor, banco diz operador → sem permissão de gestor', async () => {
    authMock.mockResolvedValue(sessao)
    findFirst.mockResolvedValue({ id: 'u1', email: 'g@a', name: 'G', role: 'OPERATOR' })
    await expect(requirePermission('config.manage')).rejects.toThrow('REDIRECT:/acesso-negado')
  })

  it('com permissão devolve o contexto (id, planta, perfil)', async () => {
    authMock.mockResolvedValue(sessao)
    findFirst.mockResolvedValue({ id: 'u1', email: 'g@a', name: 'G', role: 'MANAGER' })
    await expect(requirePermission('config.manage')).resolves.toEqual({ userId: 'u1', tenantId: 'A', role: 'MANAGER', email: 'g@a', name: 'G' })
  })

  it('permissionError devolve a mensagem para a tela', () => {
    expect(permissionError({ role: 'MANAGER' }, 'shift.operate')).toMatch(/Apenas operadores/)
    expect(permissionError({ role: 'OPERATOR' }, 'shift.operate')).toBeNull()
  })
})
