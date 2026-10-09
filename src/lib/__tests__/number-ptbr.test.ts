/**
 * T-16 — números em português.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { INVALIDO, parseNumeroBR, formatNumeroBR, MSG_NUMERO_INVALIDO } from '@/lib/number-ptbr'
import { numeroBR, numeroBROpcional } from '@/lib/zod-ptbr'

describe('parseNumeroBR', () => {
  const casos: Array<[unknown, number | null]> = [
    ['7,2', 7.2], ['7.2', 7.2], [' 7,2 ', 7.2], ['-0,5', -0.5], ['+3', 3], ['0', 0], ['0,0', 0],
    ['1.234,5', 1234.5], ['1,234.5', 1234.5], ['1.234.567', 1234567], ['1.234.567,89', 1234567.89],
    ['1.234', 1.234], ['1e-3', 0.001], ['2,50', 2.5], [7.2, 7.2], ['', null], [null, null], [undefined, null],
  ]
  for (const [entrada, esperado] of casos) {
    it(`${JSON.stringify(entrada)} → ${esperado}`, () => expect(parseNumeroBR(entrada)).toBe(esperado))
  }
  for (const ruim of ['abc', '7,2,3', '1.2.3', '1.23.456', '7 kg', '--1', ',', '.', NaN, Infinity, '1,234,567.8.9']) {
    it(`${JSON.stringify(ruim)} é inválido`, () => expect(parseNumeroBR(ruim)).toBe(INVALIDO))
  }
  it('a regressão do estoque: "2,5" não vira 2', () => {
    expect(parseFloat('2,5')).toBe(2) // o bug antigo
    expect(parseNumeroBR('2,5')).toBe(2.5)
  })
  it('formata com vírgula', () => expect(formatNumeroBR(7.25)).toBe('7,25'))
})

describe('Zod com mensagens em português', () => {
  const S = z.object({ q: numeroBR({ positivo: true, rotulo: 'A quantidade', obrigatorio: 'Informe a quantidade.' }) })
  const erro = (v: unknown) => { const r = S.safeParse({ q: v }); return r.success ? null : r.error.issues[0].message }

  it('aceita vírgula e ponto', () => {
    expect(S.parse({ q: '2,5' }).q).toBe(2.5)
    expect(S.parse({ q: '2.5' }).q).toBe(2.5)
  })
  it('mensagens em português, nunca em inglês', () => {
    expect(erro('')).toBe('Informe a quantidade.')
    expect(erro(null)).toBe('Informe a quantidade.')
    expect(erro('dois')).toBe(MSG_NUMERO_INVALIDO)
    expect(erro('0')).toBe('A quantidade precisa ser maior que zero.')
    for (const v of ['', 'dois', '0', '-1']) expect(erro(v)).not.toMatch(/expected|invalid input|received|number/i)
  })
  it('inteiro, mínimo e máximo', () => {
    const T = z.object({ m: numeroBR({ inteiro: true, min: 30, max: 480, rotulo: 'O tempo' }) })
    expect(T.parse({ m: '60' }).m).toBe(60)
    expect(T.safeParse({ m: '1,5' }).error?.issues[0].message).toBe('O tempo precisa ser um número inteiro.')
    expect(T.safeParse({ m: '10' }).error?.issues[0].message).toBe('O tempo precisa ser no mínimo 30.')
    expect(T.safeParse({ m: '999' }).error?.issues[0].message).toBe('O tempo pode ser no máximo 480.')
  })
  it('opcional: vazio vira null, inválido continua erro', () => {
    const O = z.object({ l: numeroBROpcional({ rotulo: 'O limite' }) })
    expect(O.parse({ l: '' }).l).toBeNull()
    expect(O.parse({ l: '6,5' }).l).toBe(6.5)
    expect(O.safeParse({ l: 'x' }).error?.issues[0].message).toBe(MSG_NUMERO_INVALIDO)
  })
})

describe('guarda: nenhuma action converte número com Number/parseFloat/parseInt', () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const f = join(dir, e)
      if (statSync(f).isDirectory()) walk(f, acc)
      else if (e === 'actions.ts') acc.push(f)
    }
    return acc
  }
  it('campos numéricos de formulário usam numeroBR/numeroBROpcional', () => {
    const ruins = walk(join(process.cwd(), 'src/app')).flatMap((f) => {
      const t = readFileSync(f, 'utf-8')
      return [...t.matchAll(/z\.preprocess\(\s*\([^)]*\)\s*=>[\s\S]{0,120}?(parseFloat|parseInt|Number)\(/g)]
        .map((m) => `${f.replace(process.cwd() + '/', '')}:${t.slice(0, m.index).split('\n').length}`)
    })
    expect(ruins).toEqual([])
  })
})
