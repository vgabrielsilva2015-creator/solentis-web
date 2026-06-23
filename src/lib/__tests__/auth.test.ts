import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  isRateLimited,
  isRouteAllowedForRole,
  RATE_LIMIT_MAX_ATTEMPTS,
} from '@/lib/auth-utils'

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
describe('isRateLimited — controle de tentativas', () => {
  it(`bloqueia com ${RATE_LIMIT_MAX_ATTEMPTS} ou mais falhas recentes`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS)).toBe(true)
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS + 1)).toBe(true)
  })

  it(`libera com menos de ${RATE_LIMIT_MAX_ATTEMPTS} falhas`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS - 1)).toBe(false)
    expect(isRateLimited(0)).toBe(false)
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
