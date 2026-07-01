'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ClipboardList, Power, RotateCcw } from 'lucide-react'
import { DataTableRow } from '@/components/ui/data-table-row'
import { Sheet } from '@/components/ui/sheet'
import { TurnoSheetForm } from './turno-sheet-form'
import { toggleAtivoTurno } from './actions'

type Turno = {
  id: string
  name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
  handover_timeout_minutes: number
  is_active: boolean
}

export function TurnosTable({ items }: { items: Turno[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Turno | null>(null)
  const [, startToggle] = useTransition()

  function handleToggle(t: Turno) {
    if (!confirm(t.is_active ? 'Desativar este turno?' : 'Reativar este turno?')) return
    startToggle(async () => {
      await toggleAtivoTurno(t.id)
      router.refresh()
    })
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Turno</th>
            <th className="px-4 py-3">Horário</th>
            <th className="px-4 py-3">Passagem</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <DataTableRow
              key={t.id}
              onEdit={() => setEditing(t)}
              actions={[
                {
                  label: 'Configurar dias',
                  icon: <CalendarDays className="size-4" />,
                  onSelect: () => router.push(`/gestor/turnos/${t.id}`),
                },
                {
                  label: 'Tarefas padrão',
                  icon: <ClipboardList className="size-4" />,
                  onSelect: () => router.push(`/gestor/turnos/templates/${t.id}`),
                },
                {
                  label: t.is_active ? 'Desativar' : 'Reativar',
                  icon: t.is_active ? <Power className="size-4" /> : <RotateCcw className="size-4" />,
                  danger: t.is_active,
                  onSelect: () => handleToggle(t),
                },
              ]}
            >
              <td className="px-4 py-3 font-medium text-slate-100">{t.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-300">
                {t.start_time} – {t.end_time}
                {t.crosses_midnight && (
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-500">+1 dia</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">{t.handover_timeout_minutes} min</td>
              <td className="px-4 py-3">
                {t.is_active
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
        title="Editar turno"
        description={editing?.name}
      >
        {editing && (
          <TurnoSheetForm
            key={editing.id}
            turno={editing}
            onSaved={() => { setEditing(null); router.refresh() }}
          />
        )}
      </Sheet>
    </>
  )
}
