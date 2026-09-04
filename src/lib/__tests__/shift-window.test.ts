import { describe, it, expect } from 'vitest'
import {
  podeAbrirTurnoAgora,
  horaAberturaPermitida,
  minutoAberturaPermitida,
  type JanelaTurno,
} from '../shift-window'

const TARDE: JanelaTurno = { start_time: '14:00', end_time: '22:00', crosses_midnight: false }
const NOITE: JanelaTurno = { start_time: '22:00', end_time: '06:00', crosses_midnight: true }
const MANHA: JanelaTurno = { start_time: '06:00', end_time: '14:00', crosses_midnight: false }

/** Data local com hora/minuto dados (a função usa getHours/getMinutes locais). */
function em(h: number, m: number): Date {
  return new Date(2026, 7, 6, h, m, 0, 0)
}

describe('podeAbrirTurnoAgora — turno que NÃO cruza a meia-noite (Tarde 14:00–22:00)', () => {
  it('dentro da janela: permite às 15:38 (caso do print do piloto — Tarde é válida)', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(15, 38))).toBe(true)
  })
  it('na tolerância: permite às 13:30 (60 min antes do início)', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(13, 30))).toBe(true)
  })
  it('exatamente no limite da tolerância: permite às 13:00', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(13, 0))).toBe(true)
  })
  it('fora (antes da tolerância): recusa às 12:59', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(12, 59))).toBe(false)
  })
  it('fim exclusivo: recusa exatamente às 22:00', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(22, 0))).toBe(false)
  })
  it('ainda dentro às 21:59', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(21, 59))).toBe(true)
  })
  it('fora (manhã cedo): recusa às 09:00', () => {
    expect(podeAbrirTurnoAgora(TARDE, em(9, 0))).toBe(false)
  })
})

describe('podeAbrirTurnoAgora — turno que CRUZA a meia-noite (Noite 22:00–06:00)', () => {
  it('recusa às 15:38 (bug do piloto: Noite aberta à tarde)', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(15, 38))).toBe(false)
  })
  it('permite às 23:30 (dentro da janela, antes da meia-noite)', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(23, 30))).toBe(true)
  })
  it('permite às 05:30 (dentro da janela, depois da meia-noite)', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(5, 30))).toBe(true)
  })
  it('na tolerância: permite às 21:00 (60 min antes das 22:00)', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(21, 0))).toBe(true)
  })
  it('fora (antes da tolerância): recusa às 20:59', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(20, 59))).toBe(false)
  })
  it('fim exclusivo: recusa exatamente às 06:00', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(6, 0))).toBe(false)
  })
  it('permite às 03:00 (madrugada, dentro da janela)', () => {
    expect(podeAbrirTurnoAgora(NOITE, em(3, 0))).toBe(true)
  })
})

describe('podeAbrirTurnoAgora — Manhã 06:00–14:00', () => {
  it('na tolerância: permite às 05:00', () => {
    expect(podeAbrirTurnoAgora(MANHA, em(5, 0))).toBe(true)
  })
  it('fora: recusa às 04:59', () => {
    expect(podeAbrirTurnoAgora(MANHA, em(4, 59))).toBe(false)
  })
  it('permite no início às 06:00', () => {
    expect(podeAbrirTurnoAgora(MANHA, em(6, 0))).toBe(true)
  })
  it('fim exclusivo: recusa às 14:00', () => {
    expect(podeAbrirTurnoAgora(MANHA, em(14, 0))).toBe(false)
  })
})

describe('horaAberturaPermitida / minutoAberturaPermitida', () => {
  it('22:00 → abre a partir das 21:00', () => {
    expect(horaAberturaPermitida('22:00')).toBe('21:00')
  })
  it('14:00 → abre a partir das 13:00', () => {
    expect(horaAberturaPermitida('14:00')).toBe('13:00')
  })
  it('00:30 → abre a partir das 23:30 (wrap para o dia anterior)', () => {
    expect(horaAberturaPermitida('00:30')).toBe('23:30')
  })
  it('06:00 → abre a partir das 05:00', () => {
    expect(horaAberturaPermitida('06:00')).toBe('05:00')
  })
  it('minutoAberturaPermitida faz wrap correto de 00:30', () => {
    expect(minutoAberturaPermitida('00:30')).toBe(23 * 60 + 30)
  })
})
