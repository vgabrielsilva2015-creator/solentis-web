'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarTurno, toggleAtivoTurno, type TurnoFormState } from '../actions'

type Turno = {
  id: string; name: string; start_time: string; end_time: string
  crosses_midnight: boolean; handover_timeout_minutes: number; is_active: boolean
}

const initialState: TurnoFormState = {}

export function EditTurnoForm({ turno }: { turno: Turno }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarTurno.bind(null, turno.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(turno.is_active ? 'Desativar este turno?' : 'Reativar este turno?')) return
    startToggle(async () => { await toggleAtivoTurno(turno.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos" label="Turnos" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{turno.name}</h1>
          <p className="text-sm text-slate-400 font-mono">{turno.start_time} – {turno.end_time}</p>
        </div>
        {turno.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={turno.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
              <Input id="start_time" name="start_time" type="time" defaultValue={turno.start_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
              <Input id="end_time" name="end_time" type="time" defaultValue={turno.end_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
              Timeout de passagem (minutos)
            </label>
            <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
              min={30} max={480} defaultValue={turno.handover_timeout_minutes} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.handover_timeout_minutes && (
              <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="crosses_midnight" disabled={isPendingForm}
              defaultChecked={turno.crosses_midnight}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
            <span className="text-sm text-slate-300">Cruza a meia-noite</span>
          </label>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Turno atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={turno.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : turno.is_active ? 'Desativar turno' : 'Reativar turno'}
        </Button>
      </div>
    </main>
  )
}
