'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { abrirTurno } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function ShiftForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(abrirTurno, INITIAL)

  const recommendedShiftId = useMemo(() => {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return (
      shifts.find((s) => {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        const start = sh * 60 + sm
        const end = eh * 60 + em
        if (start <= end) return nowMinutes >= start && nowMinutes < end
        return nowMinutes >= start || nowMinutes < end
      })?.id ?? null
    )
  }, [shifts])

  const [selectedShift, setSelectedShift] = useState<string | null>(recommendedShiftId)

  useEffect(() => {
    if (state.success) router.push('/operador/dashboard')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        {shifts.map((shift) => (
          <label
            key={shift.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/60 transition-colors has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/20"
          >
            <input
              type="radio"
              name="shift_id"
              value={shift.id}
              checked={selectedShift === shift.id}
              onChange={() => setSelectedShift(shift.id)}
              className="accent-emerald-500"
            />
            <div>
<<<<<<< HEAD
              <p className="text-sm font-medium">
                {shift.name}
                {shift.id === recommendedShiftId && (
                  <span className="ml-2 inline-block rounded-full bg-emerald-700/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                    Sugerido
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{shift.start_time} – {shift.end_time}</p>
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
