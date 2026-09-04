'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { agendarPreventiva, type ManutencaoFormState } from '../../actions'

const INITIAL: ManutencaoFormState = {}

type Equipment = { id: string; name: string; serial_number: string | null }

export function PreventivaForm({ equipment }: { equipment: Equipment[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(agendarPreventiva, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/gestor/manutencao/preventivas')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Equipamento</label>
        <select name="equipment_id" required className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
          <option value="">Selecione um equipamento...</option>
          {equipment.map((e) => (
            <option key={e.id} value={e.id}>{e.name} {e.serial_number ? `(SN: ${e.serial_number})` : ''}</option>
          ))}
        </select>
        {state.fieldErrors?.equipment_id && <p className="text-xs text-red-400">{state.fieldErrors.equipment_id[0]}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Data agendada</label>
        <input type="date" name="scheduled_date" required className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" />
        {state.fieldErrors?.scheduled_date && <p className="text-xs text-red-400">{state.fieldErrors.scheduled_date[0]}</p>}
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Link href="/gestor/manutencao/preventivas" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors border border-border">Cancelar</Link>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all shadow-sm disabled:opacity-50">
          {isPending ? 'Agendando…' : 'Agendar Preventiva'}
        </button>
      </div>
    </form>
  )
}
