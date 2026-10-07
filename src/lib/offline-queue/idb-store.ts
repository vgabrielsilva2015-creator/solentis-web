/**
 * Armazenamento da fila offline em IndexedDB (T-15). Só roda no navegador.
 * IndexedDB guarda também a foto (Blob), sobrevive a fechar o app e a reiniciar o
 * aparelho, e não é apagado pelo "Sair" (a limpeza do logout mexe só em caches e
 * rascunhos — ver client-cleanup.ts).
 */
import type { QueuedReading, QueueStore } from './core'

const DB_NAME = 'solentis'
const DB_VERSION = 1
const STORE = 'leituras_pendentes'
export const QUEUE_CHANGED_EVENT = 'solentis:fila-mudou'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'client_id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const req = fn(t.objectStore(STORE))
      let result: T | undefined
      if (req) req.onsuccess = () => { result = req.result }
      t.oncomplete = () => resolve(result)
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error)
    })
  } finally {
    db.close()
  }
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

export const idbStore: QueueStore = {
  async all() {
    return ((await tx<QueuedReading[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedReading[]>)) ?? [])
  },
  async put(item) {
    await tx('readwrite', (s) => { s.put(item) })
    notify()
  },
  async remove(clientId) {
    await tx('readwrite', (s) => { s.delete(clientId) })
    notify()
  },
}

export function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
