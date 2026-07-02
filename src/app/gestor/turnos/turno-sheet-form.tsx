'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarTurno, type TurnoFormState } from './actions'

type Turno = {
  id: string
  name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
  handover_timeout_minutes: number
  is_active: boolean
}

const initialState: TurnoFormState = {}

/** Form de edição de turno para dentro do Sheet. Reusa a action `editarTurno`. */
export function TurnoSheetForm({ turno, onSaved }: { turno: Turno; onSaved: () => void }) {
  const editAction = editarTurno.bind(null, turno.id)
  const [state, formAction, isPending] = useActionState(editAction, initialState)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onSaved, 700)
      return () => clearTimeout(t)
    }
  }, [state.success, onSaved])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
        <Input id="name" name="name" type="text" defaultValue={turno.name} required disabled={isPending}
          className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="start_time" className="text-sm font-medium text-foreground">Início</label>
          <Input id="start_time" name="start_time" type="time" defaultValue={turno.start_time} required disabled={isPending}
            className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="end_time" className="text-sm font-medium text-foreground">Término</label>
          <Input id="end_time" name="end_time" type="time" defaultValue={turno.end_time} required disabled={isPending}
            className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-foreground">
          Timeout de passagem (minutos)
        </label>
        <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
          min={30} max={480} defaultValue={turno.handover_timeout_minutes} required disabled={isPending}
          className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        {state.fieldErrors?.handover_timeout_minutes && (
          <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" name="crosses_midnight" disabled={isPending}
          defaultChecked={turno.crosses_midnight}
          className="h-4 w-4 rounded border-border bg-muted accent-emerald-500" />
        <span className="text-sm text-foreground">Cruza a meia-noite</span>
      </label>

      {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Turno atualizado com sucesso.</p>}

      <Button type="submit" disabled={isPending} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Dias da semana e tarefas padrão continuam em <span className="text-muted-foreground">Configurar dias</span> e{' '}
        <span className="text-muted-foreground">Tarefas padrão</span> (menu de ações da linha).
      </p>
    </form>
  )
}
