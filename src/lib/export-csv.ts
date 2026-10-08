/**
 * Exportação CSV (T-22): período obrigatório e envio em partes (cursor), para não
 * carregar a tabela inteira na memória nem cortar o resultado em silêncio.
 */

/** Neutraliza formula/CSV injection: célula iniciada por = + - @ (ou tab/CR) é fórmula no Excel/Sheets. */
export function csvSafe(value: unknown): string {
  const s = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

export const EXPORT_PAGE_SIZE = 1000
export const EXPORT_MAX_DAYS = 366

const DIA = /^\d{4}-\d{2}-\d{2}$/
const MS_DIA = 24 * 60 * 60 * 1000

export type Periodo = { from: Date; to: Date; fromStr: string; toStr: string }

/** Dia civil em Brasília (UTC-3, sem horário de verão desde 2019) → instante UTC do início do dia. */
function inicioDoDia(dia: string): Date | null {
  if (!DIA.test(dia)) return null
  const d = new Date(`${dia}T00:00:00-03:00`)
  if (Number.isNaN(d.getTime())) return null
  // rejeita 2026-02-31 (o Date "rola" para março)
  const volta = new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return volta === dia ? d : null
}

/** `from` e `to` (YYYY-MM-DD, inclusivos). Devolve [from 00:00, to+1 00:00) ou o erro em português. */
export function lerPeriodo(from: string | null, to: string | null): { periodo?: Periodo; erro?: string } {
  if (!from || !to) return { erro: 'Informe o período da exportação (from e to, no formato AAAA-MM-DD).' }
  const ini = inicioDoDia(from)
  const fim = inicioDoDia(to)
  if (!ini || !fim) return { erro: 'Período inválido. Use datas no formato AAAA-MM-DD.' }
  if (fim < ini) return { erro: 'A data final não pode ser anterior à inicial.' }
  const dias = Math.round((fim.getTime() - ini.getTime()) / MS_DIA) + 1
  if (dias > EXPORT_MAX_DAYS) return { erro: `Período grande demais (${dias} dias). O máximo por exportação é ${EXPORT_MAX_DAYS} dias.` }
  return { periodo: { from: ini, to: new Date(fim.getTime() + MS_DIA), fromStr: from, toStr: to } }
}

/** Hoje (dia civil em Brasília) menos N dias, em AAAA-MM-DD. */
export function diaBR(deslocamentoDias = 0, agora = new Date()): string {
  return new Date(agora.getTime() - 3 * 60 * 60 * 1000 + deslocamentoDias * MS_DIA).toISOString().slice(0, 10)
}

export interface FonteCsv<T extends { id: string }> {
  headers: string[]
  /** Uma página, depois do cursor (id do último item da página anterior). */
  pagina: (cursorId: string | null, take: number) => Promise<T[]>
  linha: (item: T) => unknown[]
}

/** CSV como ReadableStream: BOM + cabeçalho + uma página por vez. Memória constante. */
export function csvStream<T extends { id: string }>(fonte: FonteCsv<T>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  let cursor: string | null = null
  let comecou = false
  let fim = false
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!comecou) {
          comecou = true
          controller.enqueue(enc.encode('﻿' + fonte.headers.join(';') + '\n'))
          return
        }
        if (fim) { controller.close(); return }
        const itens = await fonte.pagina(cursor, EXPORT_PAGE_SIZE)
        if (itens.length === 0) { controller.close(); return }
        controller.enqueue(enc.encode(itens.map((i) => fonte.linha(i).map(csvSafe).join(';')).join('\n') + '\n'))
        cursor = itens[itens.length - 1].id
        if (itens.length < EXPORT_PAGE_SIZE) fim = true
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
