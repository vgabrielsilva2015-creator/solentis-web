'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEntrada } from '@/app/gestor/produtos-quimicos/actions'

type Props = { productId: string; productName: string; unit: string }

export function TecnicoEntryForm({ productId, productName, unit }: Props) {
  const router = useRouter()
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarEntrada(prev, formData)
    if (result?.success) router.push('/tecnico/estoque')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        Produto: <span className="text-foreground font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Lote, validade, condições do recebimento..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar entrada'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/tecnico/estoque')}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
