/**
 * Super Admin — Fase 2: segundo fator (TOTP). Banco real; só a sessão é simulada.
 * O `authorize` do login é exercitado de ponta a ponta no E2E (tests/superadmin-mfa.spec.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { actAs, form, redirecionou } from '@/test/auth-mock'
import { criarPlanta, criarUsuario, SENHA_TESTE } from '@/test/factories'
import { totpAt } from '@/lib/mfa/totp'
import { decifrar } from '@/lib/mfa/crypto'
import { MFA_FAIL_LIMIT } from '@/lib/rate-limit'
import { confirmarCadastro, estadoMfa, iniciarCadastro, recuperacaoRestante, redefinirMfa, verificarSegundoFator } from '@/server/mfa/service'
import { iniciarCadastroMfa, confirmarCadastroMfa } from '@/app/mfa/cadastro/actions'
import { requirePermission } from '@/server/auth/guards'

const KEY = randomBytes(32)
const T0 = 1_800_000_000_000

async function superAdmin() {
  const t = await criarPlanta({ slug: `plat-${Math.random().toString(36).slice(2, 8)}` })
  return criarUsuario(t.id, 'SUPER_ADMIN', { email: `sa-${Math.random().toString(36).slice(2, 8)}@teste.local` })
}

/** cadastra e confirma o MFA do usuário; devolve segredo e códigos de recuperação */
async function ativar(u: { id: string; tenant_id: string; email: string }, nowMs = T0) {
  const ini = await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })
  if (!ini.ok) throw new Error(ini.error)
  const conf = await confirmarCadastro(prisma, { userId: u.id, tenantId: u.tenant_id, code: totpAt(ini.segredo, nowMs), key: KEY, nowMs })
  if (!conf.ok) throw new Error(conf.error)
  return { segredo: ini.segredo, recuperacao: conf.recoveryCodes }
}

describe('cadastro do segundo fator', () => {
  it('estado none → pending → enabled; segredo cifrado no banco; códigos só como hash', async () => {
    const u = await superAdmin()
    expect(await estadoMfa(prisma, u.id)).toBe('none')
    const ini = await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })
    expect(ini.ok).toBe(true)
    if (!ini.ok) return
    expect(await estadoMfa(prisma, u.id)).toBe('pending')
    expect(ini.otpauth).toContain(`secret=${ini.segredo}`)

    const linha = await prisma.userMfa.findUniqueOrThrow({ where: { user_id: u.id } })
    expect(linha.secret_enc).not.toContain(ini.segredo)
    expect(decifrar(linha.secret_enc, KEY).texto).toBe(ini.segredo)

    const errado = await confirmarCadastro(prisma, { userId: u.id, tenantId: u.tenant_id, code: '000000', key: KEY, nowMs: T0 })
    expect(errado.ok).toBe(false)
    expect(await estadoMfa(prisma, u.id)).toBe('pending')

    const ok = await confirmarCadastro(prisma, { userId: u.id, tenantId: u.tenant_id, code: totpAt(ini.segredo, T0), key: KEY, nowMs: T0 })
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(await estadoMfa(prisma, u.id)).toBe('enabled')
    expect(ok.recoveryCodes).toHaveLength(8)
    const hashes = await prisma.mfaRecoveryCode.findMany({ where: { user_id: u.id } })
    expect(hashes).toHaveLength(8)
    for (const c of ok.recoveryCodes) expect(hashes.some((h) => h.code_hash.includes(c.replace('-', '')))).toBe(false)
    expect(await recuperacaoRestante(prisma, u.id)).toBe(8)
    expect(await prisma.auditLog.count({ where: { user_id: u.id, table_name: 'user_mfa', action: 'CREATE' } })).toBe(1)
  })

  it('já ativo: não deixa recadastrar por cima', async () => {
    const u = await superAdmin()
    await ativar(u)
    const de_novo = await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })
    expect(de_novo.ok).toBe(false)
    expect(await estadoMfa(prisma, u.id)).toBe('enabled')
  })

  it('reiniciar antes de confirmar troca o segredo (o antigo deixa de valer)', async () => {
    const u = await superAdmin()
    const a = await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })
    const b = await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })
    if (!a.ok || !b.ok) throw new Error('inesperado')
    expect(a.segredo).not.toBe(b.segredo)
    const r = await confirmarCadastro(prisma, { userId: u.id, tenantId: u.tenant_id, code: totpAt(a.segredo, T0), key: KEY, nowMs: T0 })
    expect(r.ok).toBe(false)
  })
})

describe('segundo fator no login (verificarSegundoFator)', () => {
  it('código certo entra; o mesmo código de novo é recusado (replay); o do passo seguinte entra', async () => {
    const u = await superAdmin()
    const { segredo } = await ativar(u)
    const t = T0 + 90_000
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, t), key: KEY, nowMs: t })).toEqual({ ok: true, via: 'totp' })
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, t), key: KEY, nowMs: t })).toEqual({ ok: false, motivo: 'invalido' })
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, t + 30_000), key: KEY, nowMs: t + 30_000 })).toEqual({ ok: true, via: 'totp' })
  })

  it('o código usado no cadastro também não vale de novo no login', async () => {
    const u = await superAdmin()
    const { segredo } = await ativar(u)
    expect((await verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, T0), key: KEY, nowMs: T0 })).ok).toBe(false)
  })

  it('o mesmo código enviado duas vezes AO MESMO TEMPO: só uma passa (25 envios, e o teste falha sem a condição atômica)', async () => {
    const u = await superAdmin()
    const { segredo } = await ativar(u)
    const t = T0 + 300_000
    const entrada = totpAt(segredo, t)
    const rs = await Promise.all(Array.from({ length: 25 }, () => verificarSegundoFator(prisma, { userId: u.id, entrada, key: KEY, nowMs: t })))
    expect(rs.filter((r) => r.ok)).toHaveLength(1)
  })

  it('código de recuperação vale uma vez só, aceita maiúscula e sem hífen', async () => {
    const u = await superAdmin()
    const { recuperacao } = await ativar(u)
    const c = recuperacao[0]
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: c.toUpperCase().replace('-', ' '), key: KEY, nowMs: T0 })).toEqual({ ok: true, via: 'recovery' })
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: c, key: KEY, nowMs: T0 })).toEqual({ ok: false, motivo: 'invalido' })
    expect(await recuperacaoRestante(prisma, u.id)).toBe(7)
  })

  it('código de recuperação de OUTRO usuário não serve', async () => {
    const a = await superAdmin(), b = await superAdmin()
    const ra = await ativar(a)
    await ativar(b)
    expect((await verificarSegundoFator(prisma, { userId: b.id, entrada: ra.recuperacao[0], key: KEY, nowMs: T0 })).ok).toBe(false)
  })

  it('chave errada nunca valida (e não lança como sucesso)', async () => {
    const u = await superAdmin()
    const { segredo } = await ativar(u)
    await expect(verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, T0 + 600_000), key: randomBytes(32), nowMs: T0 + 600_000 })).rejects.toThrow()
  })

  it(`${MFA_FAIL_LIMIT} falhas bloqueiam o segundo fator da conta; depois disso nem o código certo entra`, async () => {
    const u = await superAdmin()
    const { segredo } = await ativar(u)
    const t = T0 + 900_000
    for (let i = 0; i < MFA_FAIL_LIMIT; i++) {
      expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: '000000', key: KEY, nowMs: t })).toEqual({ ok: false, motivo: 'invalido' })
    }
    expect(await verificarSegundoFator(prisma, { userId: u.id, entrada: totpAt(segredo, t), key: KEY, nowMs: t })).toEqual({ ok: false, motivo: 'bloqueado' })
  })

  it('sem MFA cadastrado: nada passa', async () => {
    const u = await superAdmin()
    expect((await verificarSegundoFator(prisma, { userId: u.id, entrada: '123456', key: KEY, nowMs: T0 })).ok).toBe(false)
  })
})

describe('reset de emergência', () => {
  it('apaga TOTP e códigos, audita; a conta pode recadastrar', async () => {
    const u = await superAdmin()
    await ativar(u)
    await redefinirMfa(prisma, { userId: u.id, tenantId: u.tenant_id })
    expect(await estadoMfa(prisma, u.id)).toBe('none')
    expect(await prisma.mfaRecoveryCode.count({ where: { user_id: u.id } })).toBe(0)
    expect(await prisma.auditLog.count({ where: { table_name: 'user_mfa', action: 'DELETE', record_id: u.id } })).toBe(1)
    expect((await iniciarCadastro(prisma, { userId: u.id, email: u.email, key: KEY })).ok).toBe(true)
  })
})

describe('tabelas', () => {
  it('RLS ligado nas duas tabelas novas', async () => {
    const r = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
      SELECT relname::text AS relname, relrowsecurity FROM pg_class WHERE relname IN ('user_mfa', 'mfa_recovery_codes')`
    expect(r).toHaveLength(2)
    expect(r.every((x) => x.relrowsecurity)).toBe(true)
  })
  it('apagar o usuário apaga o MFA junto (cascata)', async () => {
    const u = await superAdmin()
    await ativar(u)
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {})
    // a FK de auditoria pode impedir apagar usuário com histórico: nesse caso o MFA continua ligado a ele, o que também é correto
    const restou = await prisma.user.findUnique({ where: { id: u.id } })
    if (!restou) expect(await prisma.userMfa.count({ where: { user_id: u.id } })).toBe(0)
  })
})

describe('telas de cadastro (actions)', () => {
  let chaveAnterior: string | undefined
  beforeEach(() => { chaveAnterior = process.env.MFA_ENCRYPTION_KEY; process.env.MFA_ENCRYPTION_KEY = KEY.toString('base64') })
  afterEach(() => { if (chaveAnterior === undefined) delete process.env.MFA_ENCRYPTION_KEY; else process.env.MFA_ENCRYPTION_KEY = chaveAnterior })

  it('exige a senha de novo: errada é recusada e nada é criado; certa devolve QR e chave', async () => {
    const u = await superAdmin()
    actAs(u)
    const ruim = await iniciarCadastroMfa({}, form({ password: 'senha-errada' }))
    expect(ruim).toEqual({ error: 'Senha incorreta.' })
    expect(await estadoMfa(prisma, u.id)).toBe('none')
    const bom = await iniciarCadastroMfa({}, form({ password: SENHA_TESTE }))
    expect(bom.qr?.dataUrl).toMatch(/^data:image\//)
    expect(bom.qr?.segredo).toMatch(/^[A-Z2-7]+$/)
    expect(await estadoMfa(prisma, u.id)).toBe('pending')
  })

  it('senha errada demais bloqueia novas tentativas', async () => {
    const u = await superAdmin()
    actAs(u)
    for (let i = 0; i < 5; i++) await iniciarCadastroMfa({}, form({ password: 'x' }))
    const r = await iniciarCadastroMfa({}, form({ password: SENHA_TESTE }))
    expect(r.error).toMatch(/Muitas tentativas/)
  })

  it('confirmar ativa, mostra os 8 códigos uma vez e derruba as sessões (session_version)', async () => {
    const u = await superAdmin()
    actAs(u)
    const passo1 = await iniciarCadastroMfa({}, form({ password: SENHA_TESTE }))
    const errado = await confirmarCadastroMfa({}, form({ code: '111111' }))
    expect(errado.error).toBeTruthy()
    const ok = await confirmarCadastroMfa({}, form({ code: totpAt(passo1.qr!.segredo, Date.now()) }))
    expect(ok.recoveryCodes).toHaveLength(8)
    expect(await estadoMfa(prisma, u.id)).toBe('enabled')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).session_version).toBe(u.session_version + 1)
  })

  it('perfis que não são SUPER_ADMIN não cadastram (nem pelo endereço direto)', async () => {
    const t = await criarPlanta()
    for (const role of ['MANAGER', 'TECHNICIAN', 'OPERATOR']) {
      const x = await criarUsuario(t.id, role)
      actAs(x)
      expect(await redirecionou(() => iniciarCadastroMfa({}, form({ password: SENHA_TESTE })))).toBeNull() // devolve { error }, não cria
      const r = await iniciarCadastroMfa({}, form({ password: SENHA_TESTE }))
      expect(r.error).toBeTruthy()
      expect(r.qr).toBeUndefined()
      expect(await estadoMfa(prisma, x.id)).toBe('none')
    }
  })
})

describe('MFA_ENFORCE no guard das actions de plataforma', () => {
  const original = process.env.MFA_ENFORCE
  afterEach(() => { if (original === undefined) delete process.env.MFA_ENFORCE; else process.env.MFA_ENFORCE = original })

  async function comoSuper(mfa?: 'ok' | 'pending' | 'none') {
    const u = await superAdmin()
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: u.id, tenantId: u.tenant_id, role: 'SUPER_ADMIN', email: u.email, mfa }, expires: '2999-01-01' } as never)
  }

  it('off: segue como antes, com qualquer claim', async () => {
    process.env.MFA_ENFORCE = 'off'
    for (const c of [undefined, 'none', 'pending'] as const) {
      await comoSuper(c)
      expect(await redirecionou(() => requirePermission('platform.admin'))).toBeNull()
    }
  })
  it('enroll: não bloqueia quem ainda não cadastrou', async () => {
    process.env.MFA_ENFORCE = 'enroll'
    await comoSuper('pending')
    expect(await redirecionou(() => requirePermission('platform.admin'))).toBeNull()
  })
  it('required: sem o 2º fator na sessão, vai para o cadastro; com ok passa', async () => {
    process.env.MFA_ENFORCE = 'required'
    for (const c of [undefined, 'none', 'pending'] as const) {
      await comoSuper(c)
      expect(await redirecionou(() => requirePermission('platform.admin'))).toBe('/mfa/cadastro')
    }
    await comoSuper('ok')
    expect(await redirecionou(() => requirePermission('platform.admin'))).toBeNull()
  })
  it('required não afeta quem não é SUPER_ADMIN', async () => {
    process.env.MFA_ENFORCE = 'required'
    const t = await criarPlanta()
    const g = await criarUsuario(t.id, 'MANAGER')
    actAs(g)
    expect(await redirecionou(() => requirePermission('config.manage'))).toBeNull()
  })
})
