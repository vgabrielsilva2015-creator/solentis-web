'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { claimLegacy, retryItem, syncOnce, type QueuedReading } from '@/lib/offline-queue/core'
import { idbAvailable, idbStore, QUEUE_CHANGED_EVENT } from '@/lib/offline-queue/idb-store'
import { enviarDaFila } from '@/components/operador/offline-sync'

function quando(item: QueuedReading) {
  const v = item.fields.recorded_at
  return v ? v.replace('T', ' ') : new Date(item.created_at).toLocaleString('pt-BR')
}

async function listar(): Promise<QueuedReading[]> {
  if (!idbAvailable()) return []
  return (await idbStore.all()).sort((a, b) => a.created_at - b.created_at)
}

export function PendentesList({ userId }: { userId: string }) {
  const [itens, setItens] = useState<QueuedReading[] | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // setState só no retorno da promessa (fora do corpo síncrono do efeito)
  const carregar = useCallback(() => listar().then(setItens), [])

  useEffect(() => {
    void carregar()
    const on = () => void carregar()
    window.addEventListener(QUEUE_CHANGED_EVENT, on)
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, on)
  }, [carregar])

  async function enviarAgora() {
    if (!navigator.onLine) { setAviso('Sem conexão. As leituras continuam guardadas e serão enviadas quando a internet voltar.'); return }
    setEnviando(true); setAviso(null)
    try {
      const r = await syncOnce({ store: idbStore, userId, send: enviarDaFila, ignorarEspera: true })
      setAviso(r.semRede
        ? 'Não foi possível falar com o servidor. Nada foi perdido; nova tentativa automática em instantes.'
        : `${r.enviadas} enviada(s)${r.recusadas ? `, ${r.recusadas} recusada(s)` : ''}.`)
    } finally {
      setEnviando(false); void carregar()
    }
  }

  async function descartar(item: QueuedReading) {
    if (!window.confirm('Descartar esta leitura? Ela será apagada deste aparelho e NÃO será enviada.')) return
    await idbStore.remove(item.client_id)
  }

  if (itens === null) return <p className="text-sm text-muted-foreground">Carregando…</p>

  const minhas = itens.filter((i) => i.owner === userId)
  const antigas = itens.filter((i) => i.owner === null)
  const deOutros = itens.filter((i) => i.owner !== null && i.owner !== userId)

  if (itens.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Nenhuma leitura pendente. Tudo foi enviado.</p>
        <Link href="/operador/leituras" className="text-sm underline">Voltar para leituras</Link>
      </div>
    )
  }

  const Linha = ({ item, children }: { item: QueuedReading; children?: React.ReactNode }) => (
    <li data-testid="fila-item" className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>Valor <strong>{item.fields.value ?? '—'}</strong> · {quando(item)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${
          item.status === 'recusada' ? 'bg-red-950/60 text-red-300'
            : item.status === 'confirmar' ? 'bg-sky-950/60 text-sky-300'
            : 'bg-amber-950/60 text-amber-300'}`}>
          {item.status === 'recusada' ? 'Recusada' : item.status === 'confirmar' ? 'Confirmar autor' : 'Aguardando envio'}
        </span>
      </div>
      {item.last_error && <p className="text-xs text-muted-foreground">{item.last_error}</p>}
      {item.photo && <p className="text-xs text-muted-foreground">Com foto</p>}
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </li>
  )

  return (
    <div className="space-y-6">
      {aviso && <p aria-live="polite" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{aviso}</p>}

      {minhas.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Suas leituras ({minhas.length})</h2>
            <Button size="sm" onClick={enviarAgora} disabled={enviando} className="h-10">
              {enviando ? 'Enviando…' : 'Enviar agora'}
            </Button>
          </div>
          <ul className="space-y-2">
            {minhas.map((i) => (
              <Linha key={i.client_id} item={i}>
                {i.status === 'recusada' && (
                  <Button size="sm" variant="outline" className="h-10" onClick={() => retryItem(idbStore, i.client_id, userId)}>Tentar de novo</Button>
                )}
                <Button size="sm" variant="ghost" className="h-10 text-red-400" onClick={() => descartar(i)}>Descartar</Button>
              </Linha>
            ))}
          </ul>
        </section>
      )}

      {antigas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Leituras antigas sem autor ({antigas.length})</h2>
          <p className="text-xs text-muted-foreground">
            Foram guardadas pela versão anterior do app, que não registrava quem fez a leitura.
            Só envie se foi você. Elas serão registradas no seu nome.
          </p>
          <ul className="space-y-2">
            {antigas.map((i) => (
              <Linha key={i.client_id} item={i}>
                {i.status === 'confirmar' && (
                  <Button size="sm" className="h-10" onClick={() => claimLegacy(idbStore, i.client_id, userId)}>Fui eu, enviar</Button>
                )}
                <Button size="sm" variant="ghost" className="h-10 text-red-400" onClick={() => descartar(i)}>Descartar</Button>
              </Linha>
            ))}
          </ul>
        </section>
      )}

      {deOutros.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Há {deOutros.length} leitura(s) de outro usuário neste aparelho. Elas serão enviadas quando ele entrar.
        </p>
      )}
    </div>
  )
}
