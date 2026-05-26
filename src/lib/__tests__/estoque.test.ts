import { describe, it, expect } from 'vitest'
import {
  calcularEstoqueAtual,
  estaAbaixoMinimo,
  calcularDivergencia,
  formatarQuantidade,
} from '@/lib/stock-utils'

describe('calcularEstoqueAtual', () => {
  it('retorna diferença entre entradas e saídas', () => {
    expect(calcularEstoqueAtual(100, 30)).toBe(70)
  })

  it('retorna zero quando entradas igualam saídas', () => {
    expect(calcularEstoqueAtual(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando saídas excedem entradas', () => {
    expect(calcularEstoqueAtual(10, 25)).toBe(-15)
  })

  it('retorna zero quando não há movimentação', () => {
    expect(calcularEstoqueAtual(0, 0)).toBe(0)
  })
})

describe('estaAbaixoMinimo', () => {
  it('dispara alerta quando calculado abaixo do mínimo', () => {
    expect(estaAbaixoMinimo(5, null, 10)).toBe(true)
  })

  it('dispara alerta quando físico abaixo do mínimo (mesmo calculado ok)', () => {
    expect(estaAbaixoMinimo(15, 4, 10)).toBe(true)
  })

  it('não dispara quando calculado e físico estão ok', () => {
    expect(estaAbaixoMinimo(15, 12, 10)).toBe(false)
  })

  it('não dispara quando físico é null e calculado está ok', () => {
    expect(estaAbaixoMinimo(20, null, 10)).toBe(false)
  })

  it('dispara quando calculado negativo e mínimo zero', () => {
    expect(estaAbaixoMinimo(-1, null, 0)).toBe(true)
  })

  it('não dispara quando tudo é zero e mínimo é zero', () => {
    expect(estaAbaixoMinimo(0, 0, 0)).toBe(false)
  })
})

describe('calcularDivergencia', () => {
  it('retorna null quando não há contagem física', () => {
    expect(calcularDivergencia(50, null)).toBeNull()
  })

  it('retorna zero quando físico igual ao calculado', () => {
    expect(calcularDivergencia(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando físico menor que calculado (perda)', () => {
    expect(calcularDivergencia(50, 42)).toBe(-8)
  })

  it('retorna valor positivo quando físico maior que calculado (ganho/erro)', () => {
    expect(calcularDivergencia(30, 35)).toBe(5)
  })
})

describe('formatarQuantidade', () => {
  it('formata número inteiro sem decimais', () => {
    expect(formatarQuantidade(100)).toBe('100')
  })

  it('formata número decimal com 2 casas', () => {
    expect(formatarQuantidade(10.5)).toBe('10.50')
  })

  it('formata zero como inteiro', () => {
    expect(formatarQuantidade(0)).toBe('0')
  })

  it('formata valor negativo inteiro sem decimais', () => {
    expect(formatarQuantidade(-15)).toBe('-15')
  })
})
