/**
 * M-04 — Contagem física com aprovação acima de 5%.
 *
 * Regra (limite fixo no código): divergência = |contado - calculado| / |calculado|.
 *  - ≤ 5% do saldo calculado → ajusta direto (aplicar = true);
 *  - > 5% → fica pendente de aprovação (aplicar = false).
 */
import { describe, it, expect } from 'vitest'
import { decidirContagem, LIMITE_DIVERGENCIA_PCT } from '@/lib/stock-review'

describe('decidirContagem (M-04)', () => {
  it('o limite fixo é 5%', () => {
    expect(LIMITE_DIVERGENCIA_PCT).toBe(5)
  })

  it('divergência dentro do limite ajusta direto', () => {
    expect(decidirContagem(100, 103)).toMatchObject({ aplicar: true, diff: 3 })   // 3%
    expect(decidirContagem(100, 95)).toMatchObject({ aplicar: true, diff: -5 })   // 5% exatos
    expect(decidirContagem(100, 100)).toMatchObject({ aplicar: true, diff: 0 })   // sem diferença
  })

  it('divergência acima do limite fica pendente', () => {
    expect(decidirContagem(100, 110).aplicar).toBe(false)   // 10%
    expect(decidirContagem(100, 94).aplicar).toBe(false)    // 6%
  })

  it('saldo calculado zero: qualquer quantidade contada > 0 é pendente', () => {
    expect(decidirContagem(0, 0)).toMatchObject({ aplicar: true, diff: 0 })
    expect(decidirContagem(0, 50).aplicar).toBe(false)
  })

  it('pct é o percentual absoluto sobre o calculado', () => {
    expect(decidirContagem(200, 190).pct).toBeCloseTo(5)
    expect(decidirContagem(200, 180).pct).toBeCloseTo(10)
  })
})
