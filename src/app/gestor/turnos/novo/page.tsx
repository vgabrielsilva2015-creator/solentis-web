'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarTurno, type TurnoFormState } from '../actions'

const initialState: TurnoFormState = {}

export default function NovoTurnoPage() {
  const [state, formAction, isPending] = useActionState(criarTurno, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <Link href="/gestor/turnos" className="text-sm text-slate-400 hover:text-slate-200">← Voltar para turnos</Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Novo turno</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Manhã, Tarde, Noite" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
                <Input id="start_time" name="start_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.start_time && <p className="text-xs text-red-400">{state.fieldErrors.start_time[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
                <Input id="end_time" name="end_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.end_time && <p className="text-xs text-red-400">{state.fieldErrors.end_time[0]}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
                Timeout de passagem (minutos)
              </label>
              <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
                min={30} max={480} defaultValue={120} required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
              {state.fieldErrors?.handover_timeout_minutes && (
                <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="crosses_midnight" disabled={isPending}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
              <span className="text-sm text-slate-300">Cruza a meia-noite</span>
            </label>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar turno'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
