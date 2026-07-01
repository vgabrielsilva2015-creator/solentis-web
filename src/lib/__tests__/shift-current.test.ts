import { describe, it, expect } from 'vitest'
import { isHorarioNoTurno, encontrarTurnoAtual, type TurnoJanela } from '@/lib/shift-utils'

// ─── isHorarioNoTurno ──────────────────────────────────────────────────────────

describe('isHorarioNoTurno — janela de turno', () => {
  it('turno diurno: dentro da janela', () => {
    // Manhã 06:00–14:00, agora 10:30 → 630 min
    expect(isHorarioNoTurno('06:00', '14:00', false, 10 * 60 + 30)).toBe(true)
  })

  it('turno diurno: fora da janela', () => {
    expect(isHorarioNoTurno('06:00', '14:00', false, 5 * 60)).toBe(false)
    expect(isHorarioNoTurno('06:00', '14:00', false, 15 * 60)).toBe(false)
  })

  it('início inclusivo, fim exclusivo', () => {
    expect(isHorarioNoTurno('06:00', '14:00', false, 6 * 60)).toBe(true) // 06:00 entra
    expect(isHorarioNoTurno('06:00', '14:00', false, 14 * 60)).toBe(false) // 14:00 já é o próximo
  })

  it('turno que cruza a meia-noite: antes da meia-noite', () => {
    // Noite 22:00–06:00, agora 23:00
    expect(isHorarioNoTurno('22:00', '06:00', true, 23 * 60)).toBe(true)
  })

  it('turno que cruza a meia-noite: depois da meia-noite', () => {
    // agora 03:00
    expect(isHorarioNoTurno('22:00', '06:00', true, 3 * 60)).toBe(true)
  })

  it('turno que cruza a meia-noite: fora da janela (meio da tarde)', () => {
    expect(isHorarioNoTurno('22:00', '06:00', true, 15 * 60)).toBe(false)
  })
})

// ─── encontrarTurnoAtual ────────────────────────────────────────────────────────

const TURNOS: TurnoJanela[] = [
  { id: 'manha', name: 'Manhã', start_time: '06:00', end_time: '14:00', crosses_midnight: false },
  { id: 'tarde', name: 'Tarde', start_time: '14:00', end_time: '22:00', crosses_midnight: false },
  { id: 'noite', name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true },
]

function dataNaHora(h: number, m = 0): Date {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

describe('encontrarTurnoAtual — seleção pelo horário local', () => {
  it('10:00 → Manhã', () => {
    expect(encontrarTurnoAtual(TURNOS, dataNaHora(10))?.id).toBe('manha')
  })

  it('18:00 → Tarde', () => {
    expect(encontrarTurnoAtual(TURNOS, dataNaHora(18))?.id).toBe('tarde')
  })

  it('23:30 → Noite', () => {
    expect(encontrarTurnoAtual(TURNOS, dataNaHora(23, 30))?.id).toBe('noite')
  })

  it('02:00 → Noite (após a virada)', () => {
    expect(encontrarTurnoAtual(TURNOS, dataNaHora(2))?.id).toBe('noite')
  })

  it('sem turno correspondente → null', () => {
    const semNoite = TURNOS.slice(0, 2) // só Manhã e Tarde
    expect(encontrarTurnoAtual(semNoite, dataNaHora(3))).toBeNull()
  })
})
