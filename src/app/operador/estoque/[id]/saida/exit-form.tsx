'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarSaida } from '../../actions'

type Props = {
  productId:    string
  productName:  string
  unit:         string
  estoqueAtual: number
}

export function ExitForm({ productId, productName, unit, estoqueAtual }: Props) {
  const router  = useRouter()
  const [qty, setQty]             = useState('')
  const [offlineError, setOfflineError] = useState(false)
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarSaida(prev, formData)
    if (result?.success && !result?.warning) router.push('/operador/estoque')
    return result
  }, null)

  const qtyNum       = parseFloat(qty) || 0
  const ficaNegativo = qtyNum > 0 && qtyNum > estoqueAtual

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />

      {offlineError && (
        <p className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      {state?.warning && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700 px-4 py-3 space-y-3">
          <p className="text-sm text-amber-300">{state.warning}</p>
          <button
            type="button"
            onClick={() => router.push('/operador/estoque')}
            className="w-full rounded-lg bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Entendido — voltar ao estoque
          </button>
        </div>
      )}

      {!state?.warning && (
        <>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">
              Quantidade usada ({unit}) *
            </label>
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {ficaNegativo && (
              <p className="text-xs text-amber-400">
                Atenção: quantidade maior que o estoque calculado ({estoqueAtual.toFixed(2)} {unit}).
                O registro será salvo mesmo assim.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data e hora do uso *</label>
            <input
              name="used_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Observações</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Onde foi usado, processo, turno..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-red-700 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Registrando...' : 'Confirmar saída'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operador/estoque')}
              className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </form>
  )
}
