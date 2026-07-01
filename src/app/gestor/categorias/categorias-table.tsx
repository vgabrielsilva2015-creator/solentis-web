'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Power, RotateCcw } from 'lucide-react'
import { DataTableRow } from '@/components/ui/data-table-row'
import { Sheet } from '@/components/ui/sheet'
import { CategoriaSheetForm } from './categoria-sheet-form'
import { toggleAtivoCategoria } from './actions'

type Categoria = { id: string; name: string; description: string | null; is_active: boolean }

export function CategoriasTable({ items }: { items: Categoria[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [, startToggle] = useTransition()

  function handleToggle(c: Categoria) {
    if (!confirm(c.is_active ? 'Desativar esta categoria?' : 'Reativar esta categoria?')) return
    startToggle(async () => {
      await toggleAtivoCategoria(c.id)
      router.refresh()
    })
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <DataTableRow
              key={c.id}
              onEdit={() => setEditing(c)}
              actions={[
                {
                  label: c.is_active ? 'Desativar' : 'Reativar',
                  icon: c.is_active ? <Power className="size-4" /> : <RotateCcw className="size-4" />,
                  danger: c.is_active,
                  onSelect: () => handleToggle(c),
                },
              ]}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-100">{c.name}</div>
                {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
              </td>
              <td className="px-4 py-3">
                {c.is_active ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>
                )}
              </td>
            </DataTableRow>
          ))}
        </tbody>
      </table>

      <Sheet
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null) }}
        title="Editar categoria"
        description={editing?.name}
      >
        {editing && (
          <CategoriaSheetForm
            key={editing.id}
            categoria={editing}
            onSaved={() => { setEditing(null); router.refresh() }}
          />
        )}
      </Sheet>
    </>
  )
}
