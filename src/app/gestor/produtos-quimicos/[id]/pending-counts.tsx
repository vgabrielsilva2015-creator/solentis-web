'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { revisarContagem } from '../actions'

type Pendente = { id: string; qty: number; unit: string; recorder: string; date: string }

export function PendingCounts({ itens }: { itens: Pendente[] }) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [rejeitando, setRejeitando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  function decidir(id: string, decisao: 'APROVAR' | 'REJEITAR', m?: string) {
    setErro(null)
    start(async () => {
      const r = await revisarContagem(id, decisao, m)
      if (r?.error) { setErro(r.error); return }
      setRejeitando(null); setMotivo('')
      router.refresh()
    })
  }

  if (itens.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-4 space-y-3">
      <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">
        Contagens aguardando aprovação ({itens.length})
      </p>
      <p className="text-xs text-muted-foreground">
        Divergência acima de 5% do saldo. Confira (pode ser erro de digitação) e aprove para ajustar o estoque, ou rejeite para descartar.
      </p>
      {erro && <p className="text-xs text-red-400">{erro}</p>}
      <ul className="space-y-3">
        {itens.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-foreground font-medium">Contado: {c.qty} {c.unit}</span>
              <span className="text-muted-foreground">{c.date} · {c.recorder}</span>
            </div>
            {rejeitando === c.id ? (
              <div className="space-y-2">
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Motivo da rejeição (opcional)"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={() => { setRejeitando(null); setMotivo('') }} disabled={isPending}
                    className="h-9 flex-1 border border-border bg-muted text-foreground hover:bg-secondary text-xs">Voltar</Button>
                  <Button type="button" onClick={() => decidir(c.id, 'REJEITAR', motivo)} disabled={isPending}
                    className="h-9 flex-1 border border-red-900/50 bg-red-950/50 text-red-300 hover:bg-red-950/70 text-xs">
                    {isPending ? 'Rejeitando…' : 'Confirmar rejeição'}</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button type="button" onClick={() => setRejeitando(c.id)} disabled={isPending}
                  className="h-9 flex-1 border border-border bg-muted text-foreground hover:bg-secondary text-xs">Rejeitar</Button>
                <Button type="button" onClick={() => decidir(c.id, 'APROVAR')} disabled={isPending}
                  className="h-9 flex-1 border border-green-900/50 bg-green-950/40 text-green-400 hover:bg-green-950/60 text-xs">
                  {isPending ? 'Aprovando…' : 'Aprovar e ajustar'}</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
