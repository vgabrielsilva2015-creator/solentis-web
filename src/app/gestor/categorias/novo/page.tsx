'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarCategoria, type CategoriaFormState } from '../actions'

const initialState: CategoriaFormState = {}

export default function NovaCategoriaPage() {
  const [state, formAction, isPending] = useActionState(criarCategoria, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <Link href="/gestor/categorias" className="text-sm text-slate-400 hover:text-slate-200">← Voltar para categorias</Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Nova categoria de equipamento</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Bombas, Aeradores" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-300">
                Descrição <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva os tipos de equipamento desta categoria…"
                className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
            </div>

            {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar categoria'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
