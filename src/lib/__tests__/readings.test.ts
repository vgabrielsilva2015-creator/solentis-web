import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// ─── Cenário 1: valor conforme (dentro dos limites) ──────────────────────────
describe('calcularNaoConformidade — valor conforme', () => {
  it('retorna false para pH=7 dentro da faixa 6–9', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite máximo (boundary)', () => {
    expect(calcularNaoConformidade(9, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite mínimo (boundary)', () => {
    expect(calcularNaoConformidade(6, 6, 9)).toBe(false)
  })
})

// ─── Cenário 2: valor não-conforme ───────────────────────────────────────────
describe('calcularNaoConformidade — valor fora do limite', () => {
  it('retorna true para pH=11 acima do limite máximo 9', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('retorna true para pH=5 abaixo do limite mínimo 6', () => {
    expect(calcularNaoConformidade(5, 6, 9)).toBe(true)
  })

  it('retorna true com apenas limite máximo definido e valor acima (DBO5=120, máx=60)', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })

  it('retorna true com apenas limite mínimo definido e valor abaixo (pH=3, mín=5)', () => {
    expect(calcularNaoConformidade(3, 5, null)).toBe(true)
  })
})

// ─── Cenário 3: casos nulos e sem limites ────────────────────────────────────
describe('calcularNaoConformidade — sem valor ou sem limites', () => {
  it('retorna null quando value é null (leitura observacional sem parâmetro)', () => {
    expect(calcularNaoConformidade(null, 6, 9)).toBeNull()
  })

  it('retorna false quando nenhum limite está definido (null, null)', () => {
    expect(calcularNaoConformidade(100, null, null)).toBe(false)
  })
})
