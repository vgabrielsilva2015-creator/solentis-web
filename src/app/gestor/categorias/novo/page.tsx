'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarCategoria, type CategoriaFormState } from '../actions'

const initialState: CategoriaFormState = {}

export default function NovaCategoriaPage() {
  const [state, formAction, isPending] = useActionState(criarCategoria, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/categorias" label="Categorias" />

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground">Nova categoria de equipamento</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Bombas, Aeradores" required disabled={isPending}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva os tipos de equipamento desta categoria…"
                className="flex w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none" />
            </div>

            {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar categoria'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
