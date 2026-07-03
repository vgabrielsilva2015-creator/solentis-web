'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Power, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableRow } from '@/components/ui/data-table-row'
import { Sheet } from '@/components/ui/sheet'
import { PontoSheetForm } from './ponto-sheet-form'
import { toggleAtivoPontoColeta } from './actions'

type PontoColeta = {
  id:          string
  name:        string
  matrix:      string | null
  location:    string | null
  description: string | null
  is_active:   boolean
  is_field:    boolean
  is_internal: boolean
  is_external: boolean
}

const MATRIX_LABELS: Record<string, string> = {
  EFLUENTE: 'Efluente',
  SUBTERRANEA: 'Água Subterrânea',
  SUPERFICIAL: 'Água Superficial',
}

export function PontosTable({ items }: { items: PontoColeta[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<PontoColeta | null>(null)
  const [, startToggle] = useTransition()

  function handleToggle(p: PontoColeta) {
    if (!confirm(p.is_active ? 'Desativar este ponto de coleta?' : 'Reativar este ponto de coleta?')) return
    startToggle(async () => {
      await toggleAtivoPontoColeta(p.id)
      router.refresh()
    })
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Ponto de Coleta</th>
            <th className="px-4 py-3">Matriz</th>
            <th className="px-4 py-3">Habilitado Para</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-3 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <DataTableRow
              key={p.id}
              onEdit={() => setEditing(p)}
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
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">{p.name}</div>
                    {p.location && <div className="text-xs text-muted-foreground">Local: {p.location}</div>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">
                {p.matrix ? (MATRIX_LABELS[p.matrix] || p.matrix) : <span className="text-muted-foreground">-</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {p.is_field
                    ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Campo</Badge>
                    : <Badge variant="outline" className="border-border text-muted-foreground">Campo</Badge>}
                  {p.is_internal
                    ? <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Interno</Badge>
                    : <Badge variant="outline" className="border-border text-muted-foreground">Interno</Badge>}
                  {p.is_external
                    ? <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Externo</Badge>
                    : <Badge variant="outline" className="border-border text-muted-foreground">Externo</Badge>}
                </div>
              </td>
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
        title="Editar ponto de coleta"
        description={editing?.name}
      >
        {editing && (
          <PontoSheetForm
            key={editing.id}
            ponto={editing}
            onSaved={() => { setEditing(null); router.refresh() }}
          />
        )}
      </Sheet>
    </>
  )
}
