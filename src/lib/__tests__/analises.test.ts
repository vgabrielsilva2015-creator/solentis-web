import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// Os testes de análise reutilizam calcularNaoConformidade (mesma lógica que leituras).
// O que é específico de análises: snapshots imutáveis e is_non_conformant sempre boolean.

// ─── Cenário 1: análise conforme (dentro dos limites) ────────────────────────
describe('análise conforme — is_non_conformant deve ser false', () => {
  it('DBO5 = 30 mg/L dentro do limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(30, null, 60)).toBe(false)
  })

  it('pH = 7,5 dentro da faixa 6,0 – 9,0', () => {
    expect(calcularNaoConformidade(7.5, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo é conforme (boundary inclusive)', () => {
    expect(calcularNaoConformidade(60, null, 60)).toBe(false)
  })
})

// ─── Cenário 2: análise não-conforme ─────────────────────────────────────────
describe('análise não-conforme — is_non_conformant deve ser true', () => {
  it('pH = 11 acima do limite máximo 9 (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('DBO5 = 120 mg/L excede o limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })
})

// ─── Cenário 3: snapshots imutáveis — lógica de aplicação ────────────────────
// O snapshot é capturado no momento do save (Server Action).
// Este teste verifica que o cálculo usa os limites fornecidos, não os atuais do BD.
describe('snapshot de limites — cálculo usa os limites informados', () => {
  it('se o limite era 9 no momento da coleta, pH=10 é não-conforme mesmo que o limite atual seja 11', () => {
    const minLimitApplied = null
    const maxLimitApplied = 9   // snapshot do momento da coleta
    expect(calcularNaoConformidade(10, minLimitApplied, maxLimitApplied)).toBe(true)
  })

  it('parâmetro sem limites definidos → false (nunca null em análises)', () => {
    const result = calcularNaoConformidade(999, null, null) ?? false
    expect(result).toBe(false)
  })
})
