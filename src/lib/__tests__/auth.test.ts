import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'
import { isRouteAllowedForRole } from '@/lib/auth-utils'
import { decideLogin, LOGIN_PAIR_FAIL_LIMIT } from '@/lib/rate-limit'

// ─── Cenário 1: senha correta autentica ──────────────────────────────────────
describe('verifyPassword — senha correta', () => {
  it('retorna true quando a senha bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('Solentis@2026', hash)
    expect(result).toBe(true)
  })
})

// ─── Cenário 2: senha errada rejeita ─────────────────────────────────────────
describe('verifyPassword — senha errada', () => {
  it('retorna false quando a senha não bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('senhaErrada!', hash)
    expect(result).toBe(false)
  })
})

// ─── Cenário 3: rate limit bloqueia após MAX tentativas ──────────────────────
// T-10: o bloqueio passou a ser por e-mail+IP (e por IP); detalhes em rate-limit.test.ts
describe('limite de tentativas — controle de tentativas', () => {
  it(`bloqueia com ${LOGIN_PAIR_FAIL_LIMIT} ou mais falhas do mesmo aparelho para o mesmo e-mail`, () => {
    expect(decideLogin({ ip: LOGIN_PAIR_FAIL_LIMIT, pair: LOGIN_PAIR_FAIL_LIMIT, email: LOGIN_PAIR_FAIL_LIMIT }).blocked).toBe(true)
    expect(decideLogin({ ip: 9, pair: LOGIN_PAIR_FAIL_LIMIT + 1, email: 9 }).blocked).toBe(true)
  })

  it(`libera com menos de ${LOGIN_PAIR_FAIL_LIMIT} falhas`, () => {
    expect(decideLogin({ ip: 4, pair: LOGIN_PAIR_FAIL_LIMIT - 1, email: 4 }).blocked).toBe(false)
    expect(decideLogin({ ip: 0, pair: 0, email: 0 }).blocked).toBe(false)
  })
})

// ─── Cenário 4: controle de acesso por perfil ────────────────────────────────
describe('isRouteAllowedForRole — acesso por prefixo de rota', () => {
  it('MANAGER acessa /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'MANAGER')).toBe(true)
  })

  it('OPERATOR é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'TECHNICIAN')).toBe(false)
  })

  it('OPERATOR acessa /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'OPERATOR')).toBe(true)
  })

  it('MANAGER acessa /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'MANAGER')).toBe(true)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})
