/**
 * M-04 — regra da contagem física de estoque.
 *
 * Uma contagem vira um ajuste (entrada/saída da diferença). Se a diferença for
 * pequena em relação ao saldo calculado (até o limite), ajusta direto. Se for
 * grande, fica PENDENTE e só é aplicada depois que um gestor (≠ quem contou)
 * aprova. Limite fixo no código por enquanto.
 */

/** Divergência máxima (em %) que ajusta sem aprovação do gestor. */
export const LIMITE_DIVERGENCIA_PCT = 5

export interface DecisaoContagem {
  /** true: ajusta na hora; false: fica pendente de aprovação. */
  aplicar: boolean
  /** contado − calculado (sinal: +entra no estoque, −sai). */
  diff: number
  /** |diff| / |calculado| × 100; Infinity quando calculado = 0 e há diferença. */
  pct: number
}

/** Decide se a contagem ajusta direto ou fica pendente, pela divergência percentual. */
export function decidirContagem(calculado: number, contado: number): DecisaoContagem {
  const diff = contado - calculado
  const pct =
    diff === 0 ? 0 : calculado === 0 ? Infinity : (Math.abs(diff) / Math.abs(calculado)) * 100
  return { aplicar: pct <= LIMITE_DIVERGENCIA_PCT, diff, pct }
}
