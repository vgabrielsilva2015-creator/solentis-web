'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarParametro, type ParametroFormState } from '../actions'

const initialState: ParametroFormState = {}

const today = new Date().toISOString().split('T')[0]

export default function NovoParametroPage() {
  const [state, formAction, isPending] = useActionState(criarParametro, initialState)

  return (
    <div className="px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/parametros" label="Parâmetros" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo parâmetro</h2>
            <p className="text-xs text-slate-400">
              Defina o parâmetro de qualidade e seus limites de conformidade.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
                <Input
                  id="name" name="name" type="text"
                  placeholder="Ex: pH, DBO₅, Turbidez"
                  required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
                {state.fieldErrors?.name && (
                  <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
                <Input
                  id="unit" name="unit" type="text"
                  placeholder="mg/L, NTU, adimensional…"
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
                  Limite mínimo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="min_limit" name="min_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                  Limite máximo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="max_limit" name="max_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
                Referência legal <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="legal_reference" name="legal_reference" type="text"
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
                defaultValue={today}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.effective_date && (
                <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="default_method_name" className="text-sm font-medium text-slate-300">
                  Método Padrão <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="default_method_name" name="default_method_name" type="text"
                  placeholder="Ex: SM 4500-H+ B"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="collection_points" className="text-sm font-medium text-slate-300">
                  Pontos de Coleta <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="collection_points" name="collection_points" type="text"
                  placeholder="Separe por vírgula (ex: Tanque 1, Entrada)"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending}
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar parâmetro'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
