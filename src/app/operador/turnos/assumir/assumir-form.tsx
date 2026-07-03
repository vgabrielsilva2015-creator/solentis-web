'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { assumirPosto } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function AssumirForm({ oldInstanceId, shifts }: { oldInstanceId: string; shifts: Shift[] }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(assumirPosto, INITIAL)

  // Pré-seleciona o turno com base no horário atual
  const recommendedShiftId = useMemo(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    for (const shift of shifts) {
      const [startH, startM] = shift.start_time.split(':').map(Number)
      const [endH, endM] = shift.end_time.split(':').map(Number)
      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM

      if (endMinutes > startMinutes) {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return shift.id
      } else {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) return shift.id
      }
    }
    return shifts[0]?.id ?? ''
  }, [shifts])

  const [selectedShift, setSelectedShift] = useState(recommendedShiftId)

  useEffect(() => {
    if (state.success) router.push('/operador/dashboard')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="old_instance_id" value={oldInstanceId} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Selecione seu turno</p>
        {shifts.map((shift) => (
          <label
            key={shift.id}
            className={[
              'flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors',
              selectedShift === shift.id
                ? 'border-emerald-700 bg-emerald-950/20'
                : 'border-slate-800 bg-slate-900 hover:bg-slate-800/60',
            ].join(' ')}
          >
            <input
              type="radio"
              name="new_shift_id"
              value={shift.id}
              checked={selectedShift === shift.id}
              onChange={() => setSelectedShift(shift.id)}
              className="accent-emerald-500"
            />
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">{shift.name}</p>
                <p className="text-xs text-slate-500">{shift.start_time} – {shift.end_time}</p>
              </div>
              {shift.id === recommendedShiftId && (
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-800/50">
                  Sugerido
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      {state.fieldErrors?.new_shift_id && (
        <p className="text-xs text-red-400">{state.fieldErrors.new_shift_id[0]}</p>
      )}
      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-red-700 hover:bg-red-600 text-white text-sm"
      >
        {isPending ? 'Assumindo posto…' : 'Assumir posto e abrir turno'}
      </Button>
    </form>
  )
}
