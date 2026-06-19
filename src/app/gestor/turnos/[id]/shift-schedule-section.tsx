'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { toggleDaySchedule } from '../actions'

type ShiftSchedule = { id: string; days_of_week: number[]; is_active: boolean }

const DAYS = [
  { id: 0, label: 'Dom', short: 'D' },
  { id: 1, label: 'Seg', short: 'S' },
  { id: 2, label: 'Ter', short: 'T' },
  { id: 3, label: 'Qua', short: 'Q' },
  { id: 4, label: 'Qui', short: 'Q' },
  { id: 5, label: 'Sex', short: 'S' },
  { id: 6, label: 'Sáb', short: 'S' },
]

export function ShiftScheduleSection({ shiftId, schedule }: { shiftId: string, schedule?: ShiftSchedule }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const activeDays = schedule?.days_of_week || []

  function handleToggleDay(dayId: number) {
    let newDays = [...activeDays]
    if (newDays.includes(dayId)) {
      newDays = newDays.filter((d) => d !== dayId)
    } else {
      newDays.push(dayId)
    }

    startTransition(async () => {
      await toggleDaySchedule(shiftId, newDays)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-medium text-slate-200">Recorrência Automática (Agendamento)</h2>
      </div>
      
      <p className="text-xs text-slate-400">
        Selecione os dias da semana em que este turno deve ser gerado automaticamente pelo sistema à meia-noite.
      </p>

      <div className="flex gap-2 mt-4">
        {DAYS.map((day) => {
          const isActive = activeDays.includes(day.id)
          return (
            <button
              key={day.id}
              onClick={() => handleToggleDay(day.id)}
              disabled={isPending}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md border transition-all ${
                isActive
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-900/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              } disabled:opacity-50`}
            >
              <span className="text-[10px] uppercase font-semibold">{day.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
