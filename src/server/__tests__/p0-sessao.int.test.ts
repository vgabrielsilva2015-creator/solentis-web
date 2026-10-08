/** P0: sessão — usuário desativado, papel trocado, planta desativada, senha trocada ou "Sair" derrubam o acesso. */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form, redirecionou } from '@/test/auth-mock'
import { criarCenario, criarUsuario, SENHA_TESTE } from '@/test/factories'
import { getActor, requirePermission } from '@/server/auth/guards'
import { guardSession, initialGuardFields, SESSION_REVALIDATE_SECONDS, type GuardedToken } from '@/lib/session-guard'
import { loadUserAccess, revokeSession, BUMP_SESSION_VERSION } from '@/lib/session-version'
import { trocarSenhaAction } from '@/app/(auth)/trocar-senha/actions'

const T0 = 1_800_000_000
const tokenDe = (u: { id: string; role: string; tenant_id: string; session_version: number }): GuardedToken => ({
  sub: u.id, role: u.role, tenantId: u.tenant_id, ...initialGuardFields(u.session_version, T0),
})
/** Uma requisição 61 s depois do login: obriga a conferência no banco. */
const depois = (tok: GuardedToken) => guardSession(tok, T0 + SESSION_REVALIDATE_SECONDS + 1, loadUserAccess)

describe('revalidação de sessão contra o banco', () => {
  it('usuário ativo, mesmo papel e planta: a sessão segue', async () => {
    const A = await criarCenario('A')
    expect((await depois(tokenDe(A.operador))).ok).toBe(true)
  })

  it.each([
    ['desativado', (id: string) => prisma.user.update({ where: { id }, data: { is_active: false } }), 'inactive'],
    ['apagado (soft delete)', (id: string) => prisma.user.update({ where: { id }, data: { deleted_at: new Date() } }), 'inactive'],
    ['papel alterado', (id: string) => prisma.user.update({ where: { id }, data: { role: 'MANAGER' } }), 'role_changed'],
    ['acesso alterado (session_version)', (id: string) => prisma.user.update({ where: { id }, data: BUMP_SESSION_VERSION }), 'version_changed'],
  ])('%s → a próxima conferência derruba', async (_n, mexer, motivo) => {
    const A = await criarCenario('A')
    const tok = tokenDe(A.operador)
    await mexer(A.operador.id)
    expect(await depois(tok)).toEqual({ ok: false, reason: motivo })
  })

  it('planta desativada derruba o usuário da planta', async () => {
    const A = await criarCenario('A')
    const tok = tokenDe(A.operador)
    await prisma.tenant.update({ where: { id: A.tenant.id }, data: { is_active: false } })
    expect(await depois(tok)).toEqual({ ok: false, reason: 'tenant_inactive' })
  })

  it('o "Sair" encerra só aquela sessão (sid), não as outras do mesmo usuário', async () => {
    const A = await criarCenario('A')
    const t1 = tokenDe(A.operador); const t2 = tokenDe(A.operador)
    await revokeSession(t1.sid!, A.operador.id)
    expect(await depois(t1)).toEqual({ ok: false, reason: 'logged_out' })
    expect((await depois(t2)).ok).toBe(true)
  })

  it('usuário apagado do banco: not_found', async () => {
    const A = await criarCenario('A')
    const tok = tokenDe(A.operador)
    await prisma.user.delete({ where: { id: A.operador.id } })
    expect(await depois(tok)).toEqual({ ok: false, reason: 'not_found' })
  })
})

describe('guarda das actions (getActor)', () => {
  it('sem sessão → /login', async () => {
    actAs(null)
    expect(await redirecionou(() => getActor())).toBe('/login')
  })

  it('usuário desativado, mesmo com sessão ainda válida → /login', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    await prisma.user.update({ where: { id: A.operador.id }, data: { is_active: false } })
    expect(await redirecionou(() => getActor())).toBe('/login')
  })

  it('id de uma planta, planta de outra na sessão → /login', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    actAs({ id: A.operador.id, tenant_id: B.tenant.id })
    expect(await redirecionou(() => getActor())).toBe('/login')
  })

  it('o papel vem do banco, não do token: sessão diz GESTOR, banco diz OPERADOR → sem permissão de gestor', async () => {
    const A = await criarCenario('A')
    actAs({ ...A.operador, role: 'MANAGER' })
    expect(await redirecionou(() => requirePermission('users.manage'))).toBe('/acesso-negado')
  })
})

describe('troca de senha', () => {
  const dados = (atual: string, nova: string) => form({ currentPassword: atual, newPassword: nova, confirmPassword: nova })

  it('com a senha atual errada: nada muda e a sessão (session_version) continua a mesma', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const antes = await prisma.user.findUniqueOrThrow({ where: { id: A.operador.id } })
    const r = await trocarSenhaAction({}, dados('errada-123', 'NovaSenha@2026x'))
    expect(r.fieldErrors?.currentPassword?.[0]).toMatch(/incorreta/i)
    const depois = await prisma.user.findUniqueOrThrow({ where: { id: A.operador.id } })
    expect(depois.password_hash).toBe(antes.password_hash)
    expect(depois.session_version).toBe(antes.session_version)
  })

  it('com a senha atual certa: troca o hash e derruba as outras sessões', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const antes = await prisma.user.findUniqueOrThrow({ where: { id: A.operador.id } })
    const outraSessao = tokenDe(A.operador)
    const r = await trocarSenhaAction({}, dados(SENHA_TESTE, 'NovaSenha@2026x'))
    expect(r.error).toBeUndefined()
    const depois1 = await prisma.user.findUniqueOrThrow({ where: { id: A.operador.id } })
    expect(depois1.password_hash).not.toBe(antes.password_hash)
    expect(depois1.session_version).toBe(antes.session_version + 1)
    expect(await depois(outraSessao)).toEqual({ ok: false, reason: 'version_changed' })
  })

  it('só mexe no próprio usuário (outro da mesma planta não muda)', async () => {
    const A = await criarCenario('A')
    const colega = await criarUsuario(A.tenant.id, 'OPERATOR')
    actAs(A.operador)
    await trocarSenhaAction({}, dados(SENHA_TESTE, 'NovaSenha@2026x'))
    const c = await prisma.user.findUniqueOrThrow({ where: { id: colega.id } })
    expect(c.password_hash).toBe(colega.password_hash)
    expect(c.session_version).toBe(colega.session_version)
  })
})
