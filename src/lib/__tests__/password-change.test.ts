/**
 * T-11 — troca de senha exige a senha atual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

const ATUAL = 'SenhaAtual123'
const HASH = bcrypt.hashSync(ATUAL, 4)

const findFirst = vi.fn()
const update = vi.fn()
const signInMock = vi.fn()
const counts = { n: 0 }
const recorded: string[][] = []

vi.mock('@/lib/prisma', () => ({ prisma: { user: { findFirst: (a: unknown) => findFirst(a), update: (a: unknown) => update(a) } } }))
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ user: { id: 'u1', tenantId: 'A', role: 'OPERATOR', email: 'op@a' } }),
  signIn: (...a: unknown[]) => signInMock(...a),
}))
vi.mock('next-auth', async () => ({ AuthError: (await import('@auth/core/errors')).AuthError }))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) }))
vi.mock('@/lib/rate-limit', async (orig) => ({
  ...(await orig<typeof import('@/lib/rate-limit')>()),
  countRecent: async () => counts.n,
  recordEvents: async (b: string[]) => { recorded.push(b) },
}))

const { trocarSenhaAction } = await import('@/app/(auth)/trocar-senha/actions')

function form(cur: string, nova: string, conf = nova) {
  const fd = new FormData()
  fd.set('currentPassword', cur); fd.set('newPassword', nova); fd.set('confirmPassword', conf)
  return fd
}

describe('trocarSenhaAction', () => {
  beforeEach(() => {
    findFirst.mockReset(); update.mockReset(); signInMock.mockReset(); counts.n = 0; recorded.length = 0
    findFirst.mockResolvedValue({ id: 'u1', email: 'op@a', password_hash: HASH })
  })

  it('sem a senha atual: recusa sem tocar no banco', async () => {
    const r = await trocarSenhaAction({}, form('', 'NovaSenha2026'))
    expect(r.fieldErrors?.currentPassword).toBeDefined()
    expect(update).not.toHaveBeenCalled()
  })

  it('senha atual errada: recusa, conta a tentativa e não troca', async () => {
    const r = await trocarSenhaAction({}, form('errada', 'NovaSenha2026'))
    expect(r.fieldErrors?.currentPassword?.[0]).toBe('Senha atual incorreta')
    expect(recorded).toEqual([['pwchange:user:u1']])
    expect(update).not.toHaveBeenCalled()
    expect(signInMock).not.toHaveBeenCalled()
  })

  it('senha atual certa: troca, derruba as outras sessões e reautentica', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/operador/turnos;307;' })
    signInMock.mockRejectedValueOnce(redirect)
    await expect(trocarSenhaAction({}, form(ATUAL, 'NovaSenha2026'))).rejects.toBe(redirect)
    const data = update.mock.calls[0][0].data
    expect(bcrypt.compareSync('NovaSenha2026', data.password_hash)).toBe(true)
    expect(data.must_change_password).toBe(false)
    expect(data.session_version).toEqual({ increment: 1 })
    expect(signInMock.mock.calls[0][1]).toMatchObject({ email: 'op@a', password: 'NovaSenha2026' })
  })

  it('busca o usuário pelo id e planta da sessão (não por e-mail)', async () => {
    await trocarSenhaAction({}, form('errada', 'NovaSenha2026'))
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'u1', tenant_id: 'A', is_active: true })
  })

  it('nova senha igual à atual é recusada', async () => {
    const r = await trocarSenhaAction({}, form(ATUAL, ATUAL))
    expect(r.fieldErrors?.newPassword).toBeDefined()
  })

  it('política única: a mesma regra que a tela mostra (10+ caracteres, letra e número)', async () => {
    expect((await trocarSenhaAction({}, form(ATUAL, 'curta1'))).fieldErrors?.newPassword).toBeDefined()
    expect((await trocarSenhaAction({}, form(ATUAL, 'semnumeroaqui'))).fieldErrors?.newPassword).toBeDefined()
    // antes: recusada por exigir maiúscula, regra que a tela não mostrava
    signInMock.mockRejectedValueOnce(Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/;307;' }))
    await expect(trocarSenhaAction({}, form(ATUAL, 'minusculas2026'))).rejects.toThrow('NEXT_REDIRECT')
  })

  it('após 5 erros em 15 min: bloqueia sem nem conferir a senha', async () => {
    counts.n = 5
    const r = await trocarSenhaAction({}, form(ATUAL, 'NovaSenha2026'))
    expect(r.error).toMatch(/Muitas tentativas/)
    expect(update).not.toHaveBeenCalled()
  })

  it('erro inesperado do banco: mensagem genérica, sem detalhe', async () => {
    findFirst.mockRejectedValueOnce(new Error("Can't reach database server at db.x.supabase.co:5432"))
    const r = await trocarSenhaAction({}, form(ATUAL, 'NovaSenha2026'))
    expect(r.error).not.toMatch(/supabase|5432|database/i)
  })
})
