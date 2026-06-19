'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { preAgendarTurno, type PreAgendarFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: PreAgendarFormState = {}

export function PreAgendarForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(preAgendarTurno, INITIAL)

  // Default: amanhã
  const [dateVal, setDateVal] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })

  useEffect(() => {
    if (state.success && state.instanceId) {
      router.push(`/gestor/turnos/tarefas/${state.instanceId}`)
    }
  }, [state.success, state.instanceId, router])

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="shift_id" className="text-sm font-medium text-slate-300">
          Turno *
        </label>
        <select
          id="shift_id" name="shift_id"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.start_time} – {s.end_time})
            </option>
          ))}
        </select>
        {state.fieldErrors?.shift_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.shift_id[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="date" className="text-sm font-medium text-slate-300">
          Data *
        </label>
        <input
          id="date" name="date"
          type="date"
          required
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.date && (
          <p className="text-xs text-red-400">{state.fieldErrors.date[0]}</p>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Após criar, você poderá atribuir tarefas antecipadamente. Quando o operador abrir o turno nessa data, as tarefas já estarão prontas.
      </p>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Criando…' : 'Pré-agendar turno'}
      </Button>
    </form>
  )
}

