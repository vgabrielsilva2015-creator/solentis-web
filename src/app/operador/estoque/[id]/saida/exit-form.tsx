'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarSaida } from '../../actions'
import { Input } from '@/components/ui/input'

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
    if (result?.success) router.push('/operador/estoque')
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
        <p aria-live="polite" className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}

      {state?.error && (
        <p aria-live="assertive" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

        <>
          <div className="space-y-1">
            <label className="text-sm text-foreground">
              Quantidade usada ({unit}) *
            </label>
            <Input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-muted border-border text-foreground placeholder-muted-foreground py-6"
              placeholder="0"
            />
            {ficaNegativo && (
              <p className="text-xs text-red-400 mt-1">
                Não é possível retirar mais que o saldo disponível ({estoqueAtual.toFixed(2)} {unit}).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-foreground">Data e hora do uso *</label>
            <Input
              name="used_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className="w-full bg-muted border-border text-foreground py-6"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-foreground">Observações</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Onde foi usado, processo, turno..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending || ficaNegativo}
              className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Registrando...' : 'Confirmar saída'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operador/estoque')}
              className="rounded-lg border border-border px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
    </form>
  )
}
