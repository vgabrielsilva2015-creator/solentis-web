/**
 * Números digitados em português (T-16). Arquivo puro: usado no servidor (Zod) e
 * na tela (pré-visualização de não-conformidade).
 *
 * Antes: `Number('7,2')` dava NaN (erro em inglês do Zod) e `parseFloat('2,5')`
 * dava 2 — a saída de 2,5 kg de cloro era gravada como 2 kg, sem aviso.
 *
 * Aceita:
 *   "7,2"  "7.2"  " 7,2 "  "-0,5"  "+3"  "1.234,5" (=1234,5)  "1,234.5" (=1234.5)
 *   "1.234.567" (=1234567, pontos como milhar)  "1e-3"
 * Recusa (devolve INVALIDO): texto, "7,2,3", "1.2.3" (milhar mal formado), NaN, Infinity.
 * Vazio vira null (campo não preenchido).
 * Regra para um único separador: ele é o DECIMAL ("1.234" = 1,234 — em leitura
 * de campo/laboratório isso é muito mais comum que milhar). Vários pontos sem
 * vírgula = separador de milhar.
 */

export const INVALIDO = Symbol('numero-invalido')

/** "1.234.567" → grupos de 3 depois do primeiro; senão não é separador de milhar. */
function milharValido(inteira: string, sep: string): boolean {
  const grupos = inteira.replace(/^[+-]/, '').split(sep)
  return /^\d{1,3}$/.test(grupos[0]) && grupos.slice(1).every((g) => /^\d{3}$/.test(g))
}

export function parseNumeroBR(input: unknown): number | null | typeof INVALIDO {
  if (input == null) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : INVALIDO
  let s = String(input).trim().replace(/\s+/g, '')
  if (s === '') return null
  if (!/^[+-]?[\d.,]+(e[+-]?\d+)?$/i.test(s)) return INVALIDO

  const ultVirgula = s.lastIndexOf(',')
  const ultPonto = s.lastIndexOf('.')
  if (ultVirgula >= 0 && ultPonto >= 0) {
    // os dois aparecem: o último é o decimal, o outro é milhar
    const decimal = ultVirgula > ultPonto ? ',' : '.'
    const milhar = decimal === ',' ? '.' : ','
    const [inteira, frac, ...resto] = s.split(decimal)
    if (resto.length || frac === undefined || frac.includes(milhar) || !milharValido(inteira, milhar)) return INVALIDO
    s = inteira.split(milhar).join('') + '.' + frac
  } else if (ultVirgula >= 0) {
    if (s.split(',').length > 2) return INVALIDO
    s = s.replace(',', '.')
  } else if (s.split('.').length > 2) {
    if (!milharValido(s.replace(/e.*$/i, ''), '.')) return INVALIDO
    s = s.split('.').join('') // vários pontos: milhar
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : INVALIDO
}

/** Para cálculos na tela: número, ou NaN se vazio/inválido. */
export function numeroOuNaN(input: unknown): number {
  const n = parseNumeroBR(input)
  return n === null || n === INVALIDO ? Number.NaN : n
}

/** Formata para mostrar em pt-BR (vírgula decimal), sem casas inventadas. */
export function formatNumeroBR(n: number | null | undefined, maxDecimais = 6): string {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { maximumFractionDigits: maxDecimais, useGrouping: false })
}

export const MSG_NUMERO_INVALIDO = 'Número inválido. Use vírgula ou ponto para os decimais, por exemplo 7,2.'
