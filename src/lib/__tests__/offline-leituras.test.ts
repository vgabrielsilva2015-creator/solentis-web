/**
 * Leituras offline — guarda de regressão (T-01 → T-15).
 *
 * T-01 desligou a fila antiga (localStorage + SyncManager), que prometia
 * "leitura salva", reenviava com campos errados e apagava tudo mesmo quando o
 * servidor recusava. A T-15 trouxe a fila nova (IndexedDB + client_id
 * idempotente). Estes testes garantem que o comportamento antigo não volta e
 * que a fila nova cumpre as regras. A tela é coberta por tests/t15-offline-fila.spec.ts.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  backoffMs, claimLegacy, classify, countFor, migrateLegacy, rejectionMessage, retryItem, syncOnce, toFormData,
  LEGACY_QUEUE_KEY, type QueuedReading, type QueueStore, type SendResult,
} from '@/lib/offline-queue/core'

const SRC = join(process.cwd(), 'src')
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules' && entry !== '__tests__') walk(full, acc) }
    else if (/\.tsx?$/.test(entry)) acc.push(full)
  }
  return acc
}
const FILES = walk(SRC).map((f) => ({ f: f.replace(SRC + '/', ''), text: readFileSync(f, 'utf-8') }))

function memStore(itens: QueuedReading[] = []): QueueStore & { map: Map<string, QueuedReading> } {
  const map = new Map(itens.map((i) => [i.client_id, i]))
  return {
    map,
    async all() { return [...map.values()] },
    async put(i) { map.set(i.client_id, i) },
    async remove(id) { map.delete(id) },
  }
}
const item = (o: Partial<QueuedReading> = {}): QueuedReading => ({
  client_id: 'c1', owner: 'u1', fields: { collection_point_id: 'p', value: '7', recorded_at: '2026-10-07T10:00' },
  created_at: 1, attempts: 0, next_try_at: 0, status: 'pendente', ...o,
})

describe('o comportamento antigo não volta (T-01)', () => {
  it('a chave da fila antiga só aparece no módulo da fila nova (migração)', () => {
    const usos = FILES.filter(({ text }) => text.includes(LEGACY_QUEUE_KEY)).map(({ f }) => f)
    expect(usos).toEqual(['lib/offline-queue/core.ts'])
  })
  it('nenhum SyncManager antigo', () => {
    expect(FILES.filter(({ text }) => /\bSyncManager\b|sync-manager/.test(text)).map(({ f }) => f)).toEqual([])
  })
  it('o formulário não usa alert nem localStorage para guardar leitura offline', () => {
    const form = readFileSync(join(SRC, 'app/operador/leituras/novo/reading-form.tsx'), 'utf-8')
    const ramo = form.slice(form.indexOf('async function guardarNaFila'), form.indexOf('function limparParaProxima'))
    expect(ramo).toContain('idbStore.put')
    expect(ramo).not.toMatch(/alert\(|localStorage\.setItem/)
  })
})

describe('syncOnce', () => {
  it('só remove depois que o servidor confirma', async () => {
    const s = memStore([item()])
    const r = await syncOnce({ store: s, userId: 'u1', send: async () => ({ success: true }) })
    expect(r.enviadas).toBe(1)
    expect(s.map.size).toBe(0)
  })

  it('reenvio já registrado (duplicate) também conta como confirmado', async () => {
    const s = memStore([item()])
    await syncOnce({ store: s, userId: 'u1', send: async () => ({ success: true, duplicate: true }) })
    expect(s.map.size).toBe(0)
  })

  it('falha de rede: mantém, agenda nova tentativa e para de tentar os próximos', async () => {
    const s = memStore([item({ client_id: 'a', created_at: 1 }), item({ client_id: 'b', created_at: 2 })])
    let chamadas = 0
    const r = await syncOnce({ store: s, userId: 'u1', now: () => 1000, send: async () => { chamadas++; throw new TypeError('Failed to fetch') } })
    expect(r.semRede).toBe(true)
    expect(chamadas).toBe(1)
    expect(s.map.get('a')).toMatchObject({ attempts: 1, status: 'pendente', next_try_at: 1000 + backoffMs(1) })
    expect(s.map.get('b')?.attempts).toBe(0)
  })

  it('respeita a espera entre tentativas, a não ser no "Enviar agora"', async () => {
    const s = memStore([item({ next_try_at: 5000 })])
    let n = 0
    await syncOnce({ store: s, userId: 'u1', now: () => 1000, send: async () => { n++; return { success: true } } })
    expect(n).toBe(0)
    await syncOnce({ store: s, userId: 'u1', now: () => 1000, ignorarEspera: true, send: async () => { n++; return { success: true } } })
    expect(n).toBe(1)
  })

  it('recusa do servidor: NÃO apaga; marca como recusada com o motivo', async () => {
    const s = memStore([item()])
    await syncOnce({ store: s, userId: 'u1', send: async () => ({ error: 'Ponto de coleta inválido ou não autorizado.' }) })
    expect(s.map.get('c1')).toMatchObject({ status: 'recusada', last_error: 'Ponto de coleta inválido ou não autorizado.' })
  })

  it('tablet compartilhado: nunca envia leitura de outro usuário', async () => {
    const s = memStore([item({ owner: 'outro' })])
    let n = 0
    await syncOnce({ store: s, userId: 'u1', send: async () => { n++; return { success: true } } })
    expect(n).toBe(0)
    expect(s.map.size).toBe(1)
  })

  it('envia na ordem em que as leituras foram feitas', async () => {
    const s = memStore([item({ client_id: 'b', created_at: 2 }), item({ client_id: 'a', created_at: 1 })])
    const ordem: string[] = []
    await syncOnce({ store: s, userId: 'u1', send: async (i) => { ordem.push(i.client_id); return { success: true } } })
    expect(ordem).toEqual(['a', 'b'])
  })
})

describe('migração da fila antiga', () => {
  const antiga = JSON.stringify([
    { collection_point_id: 'p1', parameter_id: 'x', value: '7,1', unit: 'pH', notes: 'n', recorded_at: '2026-09-01T08:00' },
    { value: '3' }, // incompleta
  ])

  it('copia tudo, marca para confirmar autor e só então apaga a chave antiga', async () => {
    const s = memStore()
    let apagou = false
    const ids = ['id-1', 'id-2']
    const r = await migrateLegacy({ store: s, readLegacy: () => antiga, removeLegacy: () => { apagou = true }, uuid: () => ids.shift()!, now: () => 10 })
    expect(r.migradas).toBe(2)
    expect(apagou).toBe(true)
    expect(s.map.get('id-1')).toMatchObject({ owner: null, status: 'confirmar', fields: { collection_point_id: 'p1', value: '7,1', recorded_at: '2026-09-01T08:00' } })
    expect(s.map.get('id-2')).toMatchObject({ status: 'recusada' })
  })

  it('se a cópia falhar, a chave antiga NÃO é apagada', async () => {
    const quebrado: QueueStore = { all: async () => [], put: async () => {}, remove: async () => {} }
    let apagou = false
    const r = await migrateLegacy({ store: quebrado, readLegacy: () => antiga, removeLegacy: () => { apagou = true } })
    expect(apagou).toBe(false)
    expect(r.erro).toBeDefined()
  })

  it('conteúdo ilegível é mantido como está', async () => {
    let apagou = false
    const r = await migrateLegacy({ store: memStore(), readLegacy: () => '{quebrado', removeLegacy: () => { apagou = true } })
    expect(apagou).toBe(false)
    expect(r.erro).toBeDefined()
  })

  it('itens sem autor só são enviados depois de alguém assumir', async () => {
    const s = memStore([item({ owner: null, status: 'confirmar' })])
    let n = 0
    const send = async (): Promise<SendResult> => { n++; return { success: true } }
    await syncOnce({ store: s, userId: 'u1', send })
    expect(n).toBe(0)
    await claimLegacy(s, 'c1', 'u1')
    await syncOnce({ store: s, userId: 'u1', send })
    expect(n).toBe(1)
  })
})

describe('auxiliares', () => {
  it('classificação e mensagens', () => {
    expect(classify({ success: true })).toBe('confirmada')
    expect(classify({ fieldErrors: { value: ['x'] } })).toBe('recusada')
    expect(rejectionMessage({ fieldErrors: { value: ['Informe o valor medido'] } })).toBe('Informe o valor medido')
  })
  it('espera cresce e para em 15 min', () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([15000, 30000, 60000])
    expect(backoffMs(30)).toBe(15 * 60_000)
  })
  it('FormData igual ao do formulário, com client_id', () => {
    const fd = toFormData(item())
    expect(fd.get('client_id')).toBe('c1')
    expect(fd.get('value')).toBe('7')
  })
  it('recusada volta a pendente só pelo próprio dono', async () => {
    const s = memStore([item({ status: 'recusada' })])
    await retryItem(s, 'c1', 'outro')
    expect(s.map.get('c1')?.status).toBe('recusada')
    await retryItem(s, 'c1', 'u1')
    expect(s.map.get('c1')?.status).toBe('pendente')
  })
  it('contagens do aviso', () => {
    const c = countFor([item(), item({ client_id: 'r', status: 'recusada' }), item({ client_id: 'l', owner: null, status: 'confirmar' }), item({ client_id: 'o', owner: 'x' })], 'u1')
    expect(c).toEqual({ minhas: 1, recusadas: 1, aConfirmar: 1, deOutros: 1 })
  })
})
