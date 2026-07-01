'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Power, RotateCcw } from 'lucide-react'
import { DataTableRow } from '@/components/ui/data-table-row'
import { Sheet } from '@/components/ui/sheet'
import { ParametroSheetLoader } from './parametro-sheet-form'
import { toggleAtivoParametro } from './actions'

type ParametroRow = {
  id:              string
  name:            string
  unit:            string
  min_limit:       number | null
  max_limit:       number | null
  legal_reference: string | null
  effective_date:  Date
  is_active:       boolean
}

function formatLimit(value: number | null): string {
  return value === null ? '—' : value.toString()
}
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ParametrosTable({ items }: { items: ParametroRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [, startToggle] = useTransition()

  function handleToggle(p: ParametroRow) {
    const msg = p.is_active
      ? 'Desativar este parâmetro? Ele deixará de aparecer em novos registros.'
      : 'Reativar este parâmetro?'
    if (!confirm(msg)) return
    startToggle(async () => {
      await toggleAtivoParametro(p.id)
      router.refresh()
    })
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Parâmetro</th>
            <th className="px-4 py-3">Limites</th>
            <th className="px-4 py-3">Vigência</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <DataTableRow
              key={p.id}
              onEdit={() => setEditing({ id: p.id, name: p.name })}
              actions={[
                {
                  label: p.is_active ? 'Desativar' : 'Reativar',
                  icon: p.is_active ? <Power className="size-4" /> : <RotateCcw className="size-4" />,
                  danger: p.is_active,
                  onSelect: () => handleToggle(p),
                },
              ]}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-slate-100">{p.name}</div>
                <div className="text-xs text-slate-500">{p.unit}</div>
                {p.legal_reference && <div className="text-xs text-slate-600">{p.legal_reference}</div>}
              </td>
              <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                {formatLimit(p.min_limit)} – {formatLimit(p.max_limit)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">{formatDate(p.effective_date)}</td>
              <td className="px-4 py-3">
                {p.is_active
                  ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                  : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
              </td>
            </DataTableRow>
          ))}
        </tbody>
      </table>

      <Sheet
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null) }}
        title="Editar parâmetro"
        description={editing?.name}
      >
        {editing && (
          <ParametroSheetLoader
            key={editing.id}
            id={editing.id}
            onSaved={() => { setEditing(null); router.refresh() }}
          />
        )}
      </Sheet>
    </>
  )
}
