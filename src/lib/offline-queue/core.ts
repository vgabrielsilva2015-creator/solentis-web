/**
 * Fila offline de leituras (T-15) — regras puras, sem IndexedDB nem React.
 *
 * Garantias:
 *  1. Toda leitura tem um `client_id` gerado no aparelho. O servidor não grava o
 *     mesmo client_id duas vezes: reenviar (rede caiu no meio, duplo toque, duas
 *     abas sincronizando) nunca duplica.
 *  2. Um item SÓ sai da fila quando o servidor confirma (`success: true`).
 *  3. Falha de rede → fica na fila e tenta de novo, com espera crescente.
 *  4. Recusa do servidor (ponto apagado, valor inválido…) → fica na fila marcada
 *     como "recusada", com o motivo, até o usuário decidir. Nada é apagado sozinho.
 *  5. Cada item pertence ao usuário que o criou. Num tablet compartilhado, o
 *     operador B nunca envia, em nome dele, a leitura do operador A.
 *  6. A fila antiga (localStorage, sem dono conhecido) é migrada para cá e
 *     só é apagada depois que todos os itens foram gravados na fila nova. Os itens
 *     migrados ficam "a confirmar": quem está logado diz se são dele antes do envio.
 */

export const LEGACY_QUEUE_KEY = 'solentis_offline_leituras'

export type QueueStatus = 'pendente' | 'recusada' | 'confirmar'

export interface QueuedReading {
  client_id: string
  /** id do usuário que registrou; null = veio da fila antiga, dono desconhecido */
  owner: string | null
  fields: Record<string, string>
  photo?: Blob | null
  photo_name?: string | null
  created_at: number
  attempts: number
  next_try_at: number
  status: QueueStatus
  last_error?: string | null
}

export interface QueueStore {
  all(): Promise<QueuedReading[]>
  put(item: QueuedReading): Promise<void>
  remove(clientId: string): Promise<void>
}

/** Resposta da server action registrarLeitura (subconjunto usado aqui). */
export interface SendResult {
  success?: boolean
  duplicate?: boolean
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export type Classification = 'confirmada' | 'recusada'

export function classify(res: SendResult | null | undefined): Classification {
  return res?.success ? 'confirmada' : 'recusada'
}

export function rejectionMessage(res: SendResult | null | undefined): string {
  if (res?.error) return res.error
  const first = Object.values(res?.fieldErrors ?? {}).flat().find(Boolean)
  return first ?? 'O servidor recusou esta leitura.'
}

/** Espera antes da próxima tentativa: 15 s, 30 s, 1 min, 2 min… até 15 min. */
export function backoffMs(attempts: number): number {
  return Math.min(15_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000)
}

export function newClientId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.randomUUID) return c.randomUUID()
  // aparelhos antigos/sem contexto seguro
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export interface SyncSummary { enviadas: number; recusadas: number; semRede: boolean }

/**
 * Envia os itens pendentes do usuário. Para na primeira falha de rede (o resto
 * esperaria pelo mesmo motivo). Nunca remove item sem confirmação do servidor.
 */
export async function syncOnce(opts: {
  store: QueueStore
  userId: string
  send: (item: QueuedReading) => Promise<SendResult>
  now?: () => number
  /** botão "Enviar agora": não respeita a espera entre tentativas */
  ignorarEspera?: boolean
}): Promise<SyncSummary> {
  const now = opts.now ?? Date.now
  const summary: SyncSummary = { enviadas: 0, recusadas: 0, semRede: false }
  const itens = (await opts.store.all())
    .filter((i) => i.owner === opts.userId && i.status === 'pendente' && (opts.ignorarEspera || i.next_try_at <= now()))
    .sort((a, b) => a.created_at - b.created_at)

  for (const item of itens) {
    let res: SendResult
    try {
      res = await opts.send(item)
    } catch {
      const attempts = item.attempts + 1
      await opts.store.put({
        ...item,
        attempts,
        next_try_at: now() + backoffMs(attempts),
        last_error: 'Sem conexão com o servidor. Nova tentativa automática.',
      })
      summary.semRede = true
      break
    }
    if (classify(res) === 'confirmada') {
      await opts.store.remove(item.client_id)
      summary.enviadas++
    } else {
      await opts.store.put({ ...item, attempts: item.attempts + 1, status: 'recusada', last_error: rejectionMessage(res) })
      summary.recusadas++
    }
  }
  return summary
}

const LEGACY_FIELDS = ['collection_point_id', 'parameter_id', 'value', 'notes', 'recorded_at'] as const

/**
 * Move a fila antiga (localStorage) para a fila nova. A chave antiga só é
 * apagada depois de confirmar que TODOS os itens estão gravados na fila nova.
 */
export async function migrateLegacy(opts: {
  store: QueueStore
  readLegacy: () => string | null
  removeLegacy: () => void
  now?: () => number
  uuid?: () => string
}): Promise<{ migradas: number; erro?: string }> {
  const raw = opts.readLegacy()
  if (!raw) return { migradas: 0 }
  let lista: unknown
  try {
    lista = JSON.parse(raw)
  } catch {
    return { migradas: 0, erro: 'Fila antiga ilegível; mantida sem alteração.' }
  }
  if (!Array.isArray(lista)) return { migradas: 0, erro: 'Fila antiga em formato inesperado; mantida sem alteração.' }
  if (lista.length === 0) { opts.removeLegacy(); return { migradas: 0 } }

  const now = (opts.now ?? Date.now)()
  const uuid = opts.uuid ?? newClientId
  const novos: QueuedReading[] = lista.map((velho, idx) => {
    const v = (velho ?? {}) as Record<string, unknown>
    const fields: Record<string, string> = {}
    for (const k of LEGACY_FIELDS) if (v[k] != null && v[k] !== '') fields[k] = String(v[k])
    const completa = !!fields.collection_point_id && !!fields.recorded_at
    return {
      client_id: uuid(),
      owner: null,
      fields,
      created_at: now + idx,
      attempts: 0,
      next_try_at: 0,
      status: completa ? 'confirmar' : 'recusada',
      last_error: completa ? null : 'Leitura antiga incompleta (sem ponto de coleta ou horário).',
    }
  })
  for (const n of novos) await opts.store.put(n)

  const gravados = new Set((await opts.store.all()).map((i) => i.client_id))
  if (!novos.every((n) => gravados.has(n.client_id))) {
    return { migradas: 0, erro: 'Não foi possível copiar a fila antiga; mantida sem alteração.' }
  }
  opts.removeLegacy()
  return { migradas: novos.length }
}

/** "Essas leituras antigas são minhas": passa a enviar em nome de quem está logado. */
export async function claimLegacy(store: QueueStore, clientId: string, userId: string): Promise<void> {
  const item = (await store.all()).find((i) => i.client_id === clientId)
  if (!item || item.owner !== null || item.status !== 'confirmar') return
  await store.put({ ...item, owner: userId, status: 'pendente', next_try_at: 0 })
}

/** Recolocar uma recusada para nova tentativa (ex.: depois que o gestor reativou o ponto). */
export async function retryItem(store: QueueStore, clientId: string, userId: string): Promise<void> {
  const item = (await store.all()).find((i) => i.client_id === clientId)
  if (!item || item.owner !== userId) return
  await store.put({ ...item, status: 'pendente', next_try_at: 0 })
}

/** Monta o FormData exatamente como o formulário online enviaria. */
export function toFormData(item: QueuedReading): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(item.fields)) fd.set(k, v)
  fd.set('client_id', item.client_id)
  if (item.photo) fd.set('photo', item.photo, item.photo_name ?? 'foto.jpg')
  return fd
}

/** Contagens para o aviso de pendências. */
export function countFor(items: QueuedReading[], userId: string) {
  return {
    minhas: items.filter((i) => i.owner === userId && i.status === 'pendente').length,
    recusadas: items.filter((i) => i.owner === userId && i.status === 'recusada').length,
    aConfirmar: items.filter((i) => i.owner === null && i.status === 'confirmar').length,
    deOutros: items.filter((i) => i.owner !== null && i.owner !== userId).length,
  }
}
