'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarContagem } from '../../actions'
import { calcularDivergencia, formatarQuantidade } from '@/lib/stock-utils'

type Props = {
  productId:        string
  unit:             string
  estoqueCalculado: number
  estoquePath?:     string
}

export function CountForm({ productId, unit, estoqueCalculado, estoquePath = '/operador/estoque' }: Props) {
  const router      = useRouter()
  const [qty, setQty] = useState('')
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarContagem(prev, formData)
    if (result?.success) router.push(estoquePath)
    return result
  }, null)

  const qtyNum      = parseFloat(qty)
  const divergencia = !isNaN(qtyNum) && qty !== '' ? calcularDivergencia(estoqueCalculado, qtyNum) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-foreground">Quantidade contada ({unit}) *</label>
        <input
          name="counted_quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="0"
        />
        {divergencia !== null && (
          <p className={`text-xs font-medium ${
            divergencia === 0 ? 'text-green-400'
            : divergencia < 0  ? 'text-red-400'
            : 'text-amber-400'
          }`}>
            Divergência: {divergencia >= 0 ? '+' : ''}{formatarQuantidade(divergencia)} {unit}
            {divergencia === 0 && ' — em linha com o calculado'}
            {divergencia < 0  && ' — físico abaixo do calculado'}
            {divergencia > 0  && ' — físico acima do calculado'}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Data e hora da contagem *</label>
        <input
          name="counted_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Condições da contagem, responsável, local..."
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar contagem'}
        </button>
        <button
          type="button"
          onClick={() => router.push(estoquePath)}
          className="rounded-lg border border-border px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
