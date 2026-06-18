'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarMetodo, toggleAtivoMetodo, type MetodoFormState } from '../actions'

type Metodo = { id: string; name: string; description: string | null; pop_content: string | null; is_active: boolean }

const initialState: MetodoFormState = {}

export function EditMetodoForm({ metodo }: { metodo: Metodo }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarMetodo.bind(null, metodo.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    const msg = metodo.is_active ? 'Desativar este método?' : 'Reativar este método?'
    if (!confirm(msg)) return
    startToggle(async () => { await toggleAtivoMetodo(metodo.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/metodos" label="Métodos de Análise" />

      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">{metodo.name}</h1>
        {metodo.is_active ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={metodo.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={2} disabled={isPendingForm}
              defaultValue={metodo.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pop_content" className="text-sm font-medium text-slate-300">
              Instrução de Trabalho (POP / IT) <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="pop_content" name="pop_content" rows={5} disabled={isPendingForm}
              defaultValue={metodo.pop_content ?? ''}
              placeholder="Passo-a-passo, reagentes, cuidados..."
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-y" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Método atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={metodo.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : metodo.is_active ? 'Desativar método' : 'Reativar método'}
        </Button>
      </div>
    </main>
  )
}
