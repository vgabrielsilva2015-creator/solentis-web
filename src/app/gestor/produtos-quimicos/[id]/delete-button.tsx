'use client'

import { useState, useTransition } from 'react'
import { excluirProduto } from '../actions'

export function DeleteButton({ id, hasMovements }: { id: string; hasMovements: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (hasMovements) {
    return (
      <p className="text-xs text-muted-foreground">
        Produto com movimentações não pode ser excluído. Use "Desativar" acima.
      </p>
    )
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await excluirProduto(id)
      if (res?.error) { setError(res.error); setConfirming(false) }
    })
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <button onClick={() => setConfirming(true)}
          className="rounded-md border border-red-800 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/20">
          Excluir produto
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-red-400">Confirma? Ação permanente.</span>
          <button onClick={handleDelete} disabled={pending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            {pending ? 'Excluindo…' : 'Sim, excluir'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={pending}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground">
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
