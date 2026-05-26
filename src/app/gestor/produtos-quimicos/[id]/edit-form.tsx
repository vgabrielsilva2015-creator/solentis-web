'use client'

import { useActionState, useState } from 'react'
import { editarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS, CHEMICAL_UNITS_PRESET } from '@/types'

type Product = {
  id: string
  name: string
  unit: string
  min_stock: number
  description: string | null
}

export function EditForm({ product }: { product: Product }) {
  const isPreset   = (CHEMICAL_UNITS_PRESET as readonly string[]).includes(product.unit)
  const [unitSelect, setUnitSelect] = useState(isPreset ? product.unit : 'outro')
  const [state, action, pending] = useActionState(editarProduto, null)

  return (
    <form action={action} className="space-y-4 mt-3">
      <input type="hidden" name="id" value={product.id} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-900/40 border border-green-700 px-3 py-2 text-sm text-green-300">
          Produto atualizado.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Nome *</label>
        <input
          name="name"
          required
          defaultValue={product.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Unidade *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            defaultValue={!isPreset ? product.unit : ''}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={product.min_stock}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Descrição</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={product.description ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
