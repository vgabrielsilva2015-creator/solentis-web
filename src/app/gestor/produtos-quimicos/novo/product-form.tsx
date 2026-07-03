'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS } from '@/types'

export function ProductForm() {
  const router = useRouter()
  const [unitSelect, setUnitSelect] = useState('')
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await criarProduto(prev, formData)
    if (result?.success) router.push('/gestor/produtos-quimicos')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-foreground">Nome *</label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Cloro Granulado"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Unidade de medida *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-foreground">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: caixa, fardo, tonelada..."
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-foreground">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">Alerta disparado quando calculado ou físico ficar abaixo deste valor.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-foreground">Descrição</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Uso, concentração, fornecedor padrão..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Salvando...' : 'Cadastrar produto'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/gestor/produtos-quimicos')}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
