'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarPassagem } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function ConfirmForm({ handoverId, shifts }: { handoverId: string; shifts: Shift[] }) {
  const router = useRouter()
  const action = confirmarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  // Pré-seleciona o turno com base no horário atual do navegador
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

  const [selectedShift, setSelectedShift] = useState<string | null>(recommendedShiftId)

  useEffect(() => {
    if (state.success) router.push('/operador/dashboard')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Suas observações
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="incoming_observations"
          rows={3}
          placeholder="Observações sobre o recebimento do turno"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      {/* Seleção de turno para abrir junto */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <p className="text-sm font-medium text-slate-300">Deseja iniciar seu turno ao confirmar?</p>
        <p className="text-xs text-slate-500">Selecione seu turno para abri-lo automaticamente, ou escolha &quot;Não iniciar&quot; para abrir depois.</p>

        <div className="space-y-2">
          {shifts.map((shift) => (
            <label
              key={shift.id}
              className={[
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                selectedShift === shift.id
                  ? 'border-emerald-700 bg-emerald-950/20'
                  : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800',
              ].join(' ')}
            >
              <input
                type="radio"
                name="shift_id"
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

          <label
            className={[
              'flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
              selectedShift === null
                ? 'border-slate-600 bg-slate-800'
                : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800',
            ].join(' ')}
          >
            <input
              type="radio"
              name="shift_id"
              value=""
              checked={selectedShift === null}
              onChange={() => setSelectedShift(null)}
              className="accent-slate-500"
            />
            <p className="text-sm text-slate-400">Não iniciar turno agora</p>
          </label>
        </div>
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending
          ? 'Confirmando…'
          : selectedShift
            ? 'Confirmar e abrir turno'
            : 'Confirmar recebimento do turno'}
      </Button>
    </form>
  )
}
