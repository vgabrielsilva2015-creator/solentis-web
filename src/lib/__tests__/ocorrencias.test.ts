import { describe, it, expect } from 'vitest'
import { calcularDeadline, isPrazoVencido, isMimeTypeValido, DEADLINE_HOURS } from '@/lib/occurrence-utils'

// ─── calcularDeadline ─────────────────────────────────────────────────────────

describe('calcularDeadline — prazo calculado por severidade', () => {
  const base = new Date('2026-05-22T10:00:00.000Z')

  it('CRITICAL → deadline = base + 24h (critério de aceite da Fase 8)', () => {
    const deadline = calcularDeadline('CRITICAL', base)
    const expected = new Date('2026-05-23T10:00:00.000Z')
    expect(deadline.getTime()).toBe(expected.getTime())
  })

  it('HIGH → deadline = base + 72h', () => {
    const deadline = calcularDeadline('HIGH', base)
    expect(deadline.getTime()).toBe(base.getTime() + 72 * 60 * 60 * 1000)
  })

  it('MEDIUM → deadline = base + 168h (7 dias)', () => {
    const deadline = calcularDeadline('MEDIUM', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })

  it('LOW → deadline = base + 720h (30 dias)', () => {
    const deadline = calcularDeadline('LOW', base)
    expect(deadline.getTime() - base.getTime()).toBe(DEADLINE_HOURS.LOW * 60 * 60 * 1000)
  })

  it('severidade desconhecida → usa fallback de 168h', () => {
    const deadline = calcularDeadline('UNKNOWN', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })
})

// ─── isPrazoVencido ───────────────────────────────────────────────────────────

describe('isPrazoVencido — detecção de prazo expirado', () => {
  it('deadline no passado → vencido', () => {
    const deadline = new Date('2026-05-20T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(true)
  })

  it('deadline no futuro → não vencido', () => {
    const deadline = new Date('2026-05-25T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(false)
  })

  it('deadline exatamente igual a now → não vencido (boundary exclusive)', () => {
    const t        = new Date('2026-05-22T10:00:00.000Z')
    expect(isPrazoVencido(t, t)).toBe(false)
  })
})

// ─── isMimeTypeValido ─────────────────────────────────────────────────────────

describe('isMimeTypeValido — rejeição de upload inválido', () => {
  it('image/jpeg → válido', () => {
    expect(isMimeTypeValido('image/jpeg')).toBe(true)
  })

  it('image/png → válido', () => {
    expect(isMimeTypeValido('image/png')).toBe(true)
  })

  it('image/webp → válido', () => {
    expect(isMimeTypeValido('image/webp')).toBe(true)
  })

  it('application/pdf → inválido', () => {
    expect(isMimeTypeValido('application/pdf')).toBe(false)
  })

  it('application/octet-stream (.exe) → inválido (critério de aceite da Fase 8)', () => {
    expect(isMimeTypeValido('application/octet-stream')).toBe(false)
  })

  it('string vazia → inválido', () => {
    expect(isMimeTypeValido('')).toBe(false)
  })
})
