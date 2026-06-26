'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { abrirTurno } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function ShiftForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(abrirTurno, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/dashboard')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        {shifts.map((shift) => (
          <label
            key={shift.id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 cursor-pointer hover:bg-slate-800/60 transition-colors has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/20"
          >
            <input
              type="radio"
              name="shift_id"
              value={shift.id}
              className="accent-emerald-500"
            />
            <div>
              <p className="text-sm font-medium">{shift.name}</p>
              <p className="text-xs text-slate-500">{shift.start_time} – {shift.end_time}</p>
            </div>
          </label>
        ))}
      </div>

      {state.fieldErrors?.shift_id && (
        <p className="text-xs text-red-400">{state.fieldErrors.shift_id[0]}</p>
      )}
      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Abrindo…' : 'Confirmar abertura'}
      </Button>
    </form>
  )
}
