import { describe, it, expect } from 'vitest'
import { normalizarData, calcularTimeoutAt, isHandoverVencido } from '@/lib/shift-utils'

describe('normalizarData — meia-noite local', () => {
  it('preserva a data e zera o horário', () => {
    const d      = new Date('2026-05-22T15:30:00')
    const result = normalizarData(d)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(4) // maio = 4 (0-indexed)
    expect(result.getDate()).toBe(22)
  })

  it('não muta o original', () => {
    const original = new Date('2026-05-22T10:00:00')
    const original_time = original.getTime()
    normalizarData(original)
    expect(original.getTime()).toBe(original_time)
  })
})

describe('calcularTimeoutAt — prazo de confirmação', () => {
  const base = new Date('2026-05-22T08:00:00.000Z')

  it('30 minutos → timeout = base + 30min', () => {
    const result = calcularTimeoutAt(base, 30)
    expect(result.getTime()).toBe(base.getTime() + 30 * 60 * 1000)
  })

  it('60 minutos → timeout = base + 1h', () => {
    const result = calcularTimeoutAt(base, 60)
    expect(result.getTime()).toBe(base.getTime() + 60 * 60 * 1000)
  })

  it('0 minutos → timeout = base (sem prazo adicional)', () => {
    const result = calcularTimeoutAt(base, 0)
    expect(result.getTime()).toBe(base.getTime())
  })

  it('não muta o original', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    const original_time = t.getTime()
    calcularTimeoutAt(t, 30)
    expect(t.getTime()).toBe(original_time)
  })
})

describe('isHandoverVencido — timeout expirado', () => {
  it('timeout no passado → vencido', () => {
    const timeoutAt = new Date('2026-05-22T07:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(true)
  })

  it('timeout no futuro → não vencido', () => {
    const timeoutAt = new Date('2026-05-22T09:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(false)
  })

  it('timeout igual a now → não vencido (boundary exclusive)', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(t, t)).toBe(false)
  })
})
