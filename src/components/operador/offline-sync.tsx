'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CloudOff, AlertTriangle } from 'lucide-react'
import { registrarLeitura } from '@/app/operador/leituras/actions'
import { countFor, migrateLegacy, syncOnce, toFormData, LEGACY_QUEUE_KEY, type QueuedReading } from '@/lib/offline-queue/core'
import { idbAvailable, idbStore, QUEUE_CHANGED_EVENT } from '@/lib/offline-queue/idb-store'

const INTERVALO_MS = 60_000

/** Envia uma leitura da fila pela mesma server action do formulário. */
export function enviarDaFila(item: QueuedReading) {
  return registrarLeitura({}, toFormData(item))
}

/**
 * T-15: sincroniza a fila offline do usuário logado e mostra o aviso de
 * pendências no topo. Dispara ao abrir, ao voltar a internet, ao voltar para a
 * aba e a cada minuto. Uma sincronização por vez nesta aba.
 */
export function OfflineSync({ userId }: { userId: string }) {
  const [contagem, setContagem] = useState({ minhas: 0, recusadas: 0, aConfirmar: 0, deOutros: 0 })
  const rodando = useRef(false)

  const atualizarContagem = useCallback(async () => {
    if (!idbAvailable()) return
    try { setContagem(countFor(await idbStore.all(), userId)) } catch { /* sem IndexedDB */ }
  }, [userId])

  const sincronizar = useCallback(async () => {
    if (!idbAvailable() || rodando.current || !navigator.onLine) return
    rodando.current = true
    try {
      await syncOnce({ store: idbStore, userId, send: enviarDaFila })
    } catch {
      // erro inesperado lendo a fila: tenta de novo no próximo ciclo
    } finally {
      rodando.current = false
      void atualizarContagem()
    }
  }, [userId, atualizarContagem])

  useEffect(() => {
    if (!idbAvailable()) return
    void (async () => {
      try {
        await migrateLegacy({
          store: idbStore,
          readLegacy: () => localStorage.getItem(LEGACY_QUEUE_KEY),
          removeLegacy: () => localStorage.removeItem(LEGACY_QUEUE_KEY),
        })
      } catch { /* mantém a fila antiga intacta */ }
      await atualizarContagem()
      await sincronizar()
    })()

    const onVisible = () => { if (document.visibilityState === 'visible') void sincronizar() }
    const onChange = () => void atualizarContagem()
    window.addEventListener('online', sincronizar)
    window.addEventListener(QUEUE_CHANGED_EVENT, onChange)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(sincronizar, INTERVALO_MS)
    return () => {
      window.removeEventListener('online', sincronizar)
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChange)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [sincronizar, atualizarContagem])

  const atencao = contagem.recusadas + contagem.aConfirmar
  if (contagem.minhas === 0 && atencao === 0) return null

  return (
    <Link
      href="/operador/leituras/pendentes"
      aria-label="Leituras guardadas neste aparelho"
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        atencao > 0 ? 'bg-red-950/60 text-red-300' : 'bg-amber-950/60 text-amber-300'
      }`}
    >
      {atencao > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      <span data-testid="fila-contagem">{contagem.minhas + atencao}</span>
      <span className="hidden sm:inline">{atencao > 0 ? 'precisam de atenção' : 'aguardando envio'}</span>
    </Link>
  )
}
