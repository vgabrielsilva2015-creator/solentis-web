import { describe, it, expect } from 'vitest'
import { addDays, isOverdue } from '@/lib/equipment-utils'

// ─── addDays ─────────────────────────────────────────────────────────────────

describe('addDays — agendamento de preventivas', () => {
  it('adiciona 30 dias corretamente', () => {
    const base   = new Date('2026-01-01T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCDate()).toBe(31)
    expect(result.getUTCMonth()).toBe(0) // janeiro
  })

  it('atravessa virada de mês', () => {
    const base   = new Date('2026-01-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCMonth()).toBe(1) // fevereiro
    expect(result.getUTCDate()).toBe(19)
  })

  it('atravessa virada de ano', () => {
    const base   = new Date('2026-12-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCFullYear()).toBe(2027)
  })

  it('não muta a data original', () => {
    const base    = new Date('2026-06-01T00:00:00.000Z')
    const original = base.toISOString()
    addDays(base, 15)
    expect(base.toISOString()).toBe(original)
  })

  it('frequência de 1 dia agenda para amanhã', () => {
    const base   = new Date('2026-05-21T12:00:00.000Z')
    const result = addDays(base, 1)
    expect(result.getUTCDate()).toBe(22)
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────

describe('isOverdue — detecção de preventiva vencida', () => {
  it('data passada é considerada vencida', () => {
    const scheduled = new Date('2026-05-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(true)
  })

  it('data futura não é vencida', () => {
    const scheduled = new Date('2026-06-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('data igual à hoje não é vencida (boundary inclusive)', () => {
    const scheduled = new Date('2026-05-21')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('ignora a hora — apenas a data importa', () => {
    // Agendado às 23:59 do dia anterior → vencido hoje
    const scheduled = new Date('2026-05-20T23:59:59')
    const today     = new Date('2026-05-21T00:00:01')
    expect(isOverdue(scheduled, today)).toBe(true)
  })
})
