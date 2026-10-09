/**
 * T-10 — limites de login e de pedido de reset.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
const {
  decideLogin, resetAllowed, clientIp, emailKey, buckets,
  LOGIN_IP_FAIL_LIMIT, LOGIN_PAIR_FAIL_LIMIT, LOGIN_EMAIL_DELAY_FROM, LOGIN_MAX_DELAY_MS,
  RESET_EMAIL_LIMIT, RESET_IP_LIMIT,
} = await import('@/lib/rate-limit')

const h = (o: Record<string, string>) => new Headers(o)

describe('decideLogin', () => {
  it('sem falhas: libera sem atraso', () => {
    expect(decideLogin({ ip: 0, pair: 0, email: 0 })).toEqual({ blocked: false, delayMs: 0 })
  })

  it(`bloqueia o par e-mail+IP a partir de ${LOGIN_PAIR_FAIL_LIMIT} falhas`, () => {
    expect(decideLogin({ ip: 4, pair: LOGIN_PAIR_FAIL_LIMIT - 1, email: 4 }).blocked).toBe(false)
    expect(decideLogin({ ip: 5, pair: LOGIN_PAIR_FAIL_LIMIT, email: 5 }).blocked).toBe(true)
  })

  it(`bloqueia o IP a partir de ${LOGIN_IP_FAIL_LIMIT} falhas (vários e-mails)`, () => {
    expect(decideLogin({ ip: LOGIN_IP_FAIL_LIMIT - 1, pair: 1, email: 1 }).blocked).toBe(false)
    expect(decideLogin({ ip: LOGIN_IP_FAIL_LIMIT, pair: 1, email: 1 }).blocked).toBe(true)
  })

  it('SEM lockout destrutivo: muitas falhas no e-mail vindas de outros IPs nunca bloqueiam o dono', () => {
    // o dono entra do próprio aparelho: par e IP limpos
    const d = decideLogin({ ip: 0, pair: 0, email: 500 })
    expect(d.blocked).toBe(false)
    expect(d.delayMs).toBe(LOGIN_MAX_DELAY_MS)
  })

  it('atraso progressivo por e-mail: 1 s, 2 s, 4 s, 8 s e para em 8 s', () => {
    const at = (n: number) => decideLogin({ ip: 0, pair: 0, email: n }).delayMs
    expect(at(LOGIN_EMAIL_DELAY_FROM - 1)).toBe(0)
    expect([at(5), at(6), at(7), at(8), at(9), at(50)]).toEqual([1000, 2000, 4000, 8000, 8000, 8000])
  })
})

describe('resetAllowed', () => {
  it(`até ${RESET_EMAIL_LIMIT} pedidos por e-mail e ${RESET_IP_LIMIT} por IP na janela`, () => {
    expect(resetAllowed({ ip: 0, email: RESET_EMAIL_LIMIT - 1 })).toBe(true)
    expect(resetAllowed({ ip: 0, email: RESET_EMAIL_LIMIT })).toBe(false)
    expect(resetAllowed({ ip: RESET_IP_LIMIT, email: 0 })).toBe(false)
  })
})

describe('clientIp', () => {
  it('prioriza o cabeçalho da Vercel e pega o primeiro IP da lista', () => {
    expect(clientIp(h({ 'x-vercel-forwarded-for': '200.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('200.1.1.1')
    expect(clientIp(h({ 'x-forwarded-for': '200.1.1.1, 10.0.0.1' }))).toBe('200.1.1.1')
    expect(clientIp(h({ 'x-real-ip': '200.2.2.2' }))).toBe('200.2.2.2')
  })
  it('sem cabeçalho ou valor absurdo: "unknown"', () => {
    expect(clientIp(h({}))).toBe('unknown')
    expect(clientIp(undefined)).toBe('unknown')
    expect(clientIp(h({ 'x-forwarded-for': 'a'.repeat(200) }))).toBe('unknown')
  })
})

describe('buckets', () => {
  it('nunca guardam o e-mail em texto e não diferenciam maiúsculas', () => {
    const b = buckets.loginPair('Operador@Solentis.local', '1.2.3.4')
    expect(b).not.toMatch(/operador|solentis/i)
    expect(emailKey('Operador@Solentis.local ')).toBe(emailKey('operador@solentis.local'))
  })
})
