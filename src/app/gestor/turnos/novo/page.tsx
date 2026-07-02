'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarTurno, type TurnoFormState } from '../actions'

const initialState: TurnoFormState = {}

export default function NovoTurnoPage() {
  const [state, formAction, isPending] = useActionState(criarTurno, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/turnos" label="Turnos" />

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">Novo turno</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Manhã, Tarde, Noite" required disabled={isPending}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="start_time" className="text-sm font-medium text-foreground">Início</label>
                <Input id="start_time" name="start_time" type="time" required disabled={isPending}
                  className="border-border bg-muted text-foreground focus-visible:ring-ring" />
                {state.fieldErrors?.start_time && <p className="text-xs text-red-400">{state.fieldErrors.start_time[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end_time" className="text-sm font-medium text-foreground">Término</label>
                <Input id="end_time" name="end_time" type="time" required disabled={isPending}
                  className="border-border bg-muted text-foreground focus-visible:ring-ring" />
                {state.fieldErrors?.end_time && <p className="text-xs text-red-400">{state.fieldErrors.end_time[0]}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-foreground">
                Timeout de passagem (minutos)
              </label>
              <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
                min={30} max={480} defaultValue={120} required disabled={isPending}
                className="border-border bg-muted text-foreground focus-visible:ring-ring" />
              {state.fieldErrors?.handover_timeout_minutes && (
                <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="crosses_midnight" disabled={isPending}
                className="h-4 w-4 rounded border-border bg-muted accent-emerald-500" />
              <span className="text-sm text-foreground">Cruza a meia-noite</span>
            </label>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar turno'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
