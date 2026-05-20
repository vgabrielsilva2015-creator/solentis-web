'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarPonto, toggleAtivoPonto, type PontoFormState } from '../actions'

type Ponto = { id: string; name: string; location: string | null; description: string | null; is_active: boolean }

const initialState: PontoFormState = {}

export function EditPontoForm({ ponto }: { ponto: Ponto }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarPonto.bind(null, ponto.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(ponto.is_active ? 'Desativar este ponto de coleta?' : 'Reativar este ponto de coleta?')) return
    startToggle(async () => { await toggleAtivoPonto(ponto.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/gestor/pontos-de-coleta" className="hover:text-slate-200">Pontos de Coleta</Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Editar</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{ponto.name}</h1>
          {ponto.location && <p className="text-sm text-slate-400">{ponto.location}</p>}
        </div>
        {ponto.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={ponto.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-slate-300">
              Localização <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <Input id="location" name="location" type="text" defaultValue={ponto.location ?? ''} disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={3} disabled={isPendingForm}
              defaultValue={ponto.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Ponto atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={ponto.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : ponto.is_active ? 'Desativar ponto' : 'Reativar ponto'}
        </Button>
      </div>
    </main>
  )
}
