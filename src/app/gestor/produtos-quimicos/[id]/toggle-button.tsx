'use client'

import { useTransition } from 'react'
import { toggleAtivoProduto } from '../actions'

export function ToggleButton({ id, is_active }: { id: string; is_active: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => toggleAtivoProduto(id, !is_active))}
      disabled={pending}
      className={`rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
        is_active
          ? 'border-red-800 text-red-400 hover:bg-red-900/20'
          : 'border-green-800 text-green-400 hover:bg-green-900/20'
      }`}
    >
      {pending ? '...' : is_active ? 'Desativar produto' : 'Reativar produto'}
    </button>
  )
}
