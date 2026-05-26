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

      <div className="rounded-md bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
        Produto: <span className="text-slate-200 font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
