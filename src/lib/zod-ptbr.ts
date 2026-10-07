/**
 * Campos numéricos de formulário com mensagens em português (T-16).
 * Use no lugar de `z.preprocess((v) => Number(v) | parseFloat(...) | parseInt(...), z.number())`.
 */
import { z } from 'zod'
import { INVALIDO, MSG_NUMERO_INVALIDO, parseNumeroBR } from '@/lib/number-ptbr'

interface Opcoes {
  /** mensagem quando o campo vem vazio (obrigatório) */
  obrigatorio?: string
  min?: number
  max?: number
  /** maior que zero */
  positivo?: boolean
  inteiro?: boolean
  /** texto curto do campo para as mensagens, ex.: "A quantidade" */
  rotulo?: string
}

function regras(o: Opcoes) {
  const r = o.rotulo ?? 'O valor'
  let n = z.number({ error: MSG_NUMERO_INVALIDO })
  if (o.inteiro) n = n.int({ error: `${r} precisa ser um número inteiro.` })
  if (o.positivo) n = n.positive({ error: `${r} precisa ser maior que zero.` })
  if (o.min !== undefined) n = n.min(o.min, { error: `${r} precisa ser no mínimo ${String(o.min).replace('.', ',')}.` })
  if (o.max !== undefined) n = n.max(o.max, { error: `${r} pode ser no máximo ${String(o.max).replace('.', ',')}.` })
  return n
}

const converter = (v: unknown) => {
  const n = parseNumeroBR(v)
  return n === INVALIDO ? Number.NaN : n
}

/** Número obrigatório. */
export function numeroBR(o: Opcoes = {}) {
  return z.preprocess(
    (v) => converter(v) ?? undefined,
    regras(o).optional().refine((x) => x !== undefined, { error: o.obrigatorio ?? 'Informe um número.' }),
  ).transform((x) => x as number)
}

/** Número opcional: vazio vira null. */
export function numeroBROpcional(o: Opcoes = {}) {
  return z.preprocess((v) => converter(v), regras(o).nullable())
}
