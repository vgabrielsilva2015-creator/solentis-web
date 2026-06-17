'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarParametro, toggleAtivoParametro, type ParametroFormState } from '../actions'

type Parametro = {
  id:              string
  name:            string
  unit:            string
  min_limit:       number | null
  max_limit:       number | null
  legal_reference: string | null
  effective_date:  Date
  is_active:       boolean
}

const initialState: ParametroFormState = {}

export function EditParametroForm({ parametro }: { parametro: Parametro }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarParametro.bind(null, parametro.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  const isPending = isPendingForm || isPendingToggle

  function handleToggle() {
    const msg = parametro.is_active
      ? 'Desativar este parâmetro? Ele deixará de aparecer em novos registros.'
      : 'Reativar este parâmetro?'
    if (!confirm(msg)) return

    startToggle(async () => {
      await toggleAtivoParametro(parametro.id)
      router.refresh()
    })
  }

  const effectiveDateStr = parametro.effective_date.toISOString().split('T')[0]

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/parametros" label="Parâmetros" />

      {/* Título + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{parametro.name}</h1>
          <p className="text-sm text-slate-400">{parametro.unit}</p>
        </div>
        {parametro.is_active ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <h2 className="text-base font-medium text-slate-200">Dados do parâmetro</h2>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                defaultValue={parametro.name}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
              <Input
                id="unit" name="unit" type="text"
                defaultValue={parametro.unit}
                placeholder="mg/L, NTU, pH…"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.unit && (
                <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="min_limit" className="text-sm font-medium text-slate-300">
                Limite mínimo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="min_limit" name="min_limit" type="number" step="0.01"
                defaultValue={parametro.min_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                Limite máximo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="max_limit" name="max_limit" type="number" step="0.01"
                defaultValue={parametro.max_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
              Referência legal <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <Input
              id="legal_reference" name="legal_reference" type="text"
              defaultValue={parametro.legal_reference ?? ''}
              placeholder="Ex: CONAMA 430/2011 Art. 16"
              disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="effective_date" className="text-sm font-medium text-slate-300">
              Data de vigência
            </label>
            <Input
              id="effective_date" name="effective_date" type="date"
              defaultValue={effectiveDateStr}
              required disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
            />
            {state.fieldErrors?.effective_date && (
              <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          {state.success && (
            <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
              Parâmetro atualizado com sucesso.
            </p>
          )}

          <Button
            type="submit" disabled={isPending}
            className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      {/* Ações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>
        <Button
          type="button" variant="outline" disabled={isPending}
          onClick={handleToggle}
          className={
            parametro.is_active
              ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
              : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'
          }
        >
          {isPendingToggle ? 'Aguarde…' : parametro.is_active ? 'Desativar parâmetro' : 'Reativar parâmetro'}
        </Button>
      </div>
    </main>
  )
}
