/**
 * Regras da resolução de ocorrência que valem na tela e no servidor (T-20).
 * Arquivo puro: usado pelo kanban (cliente) e por src/server/occurrences/resolve.ts.
 */
import { z } from 'zod'

export const RESOLUCAO_MIN = 10
export const RESOLUCAO_MAX = 2000

export const ResolucaoSchema = z.object({
  resolution_notes: z
    .string({ error: 'Descreva a ação tomada para resolver.' })
    .trim()
    .min(RESOLUCAO_MIN, { error: `Descreva a ação tomada (mínimo ${RESOLUCAO_MIN} caracteres).` })
    .max(RESOLUCAO_MAX, { error: `A descrição pode ter no máximo ${RESOLUCAO_MAX} caracteres.` }),
})

export function resolucaoValida(texto: string): boolean {
  return ResolucaoSchema.safeParse({ resolution_notes: texto }).success
}
