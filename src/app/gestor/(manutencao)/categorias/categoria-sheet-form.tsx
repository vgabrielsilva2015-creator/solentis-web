'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarCategoria, type CategoriaFormState } from './actions'

type Categoria = { id: string; name: string; description: string | null; is_active: boolean }

const initialState: CategoriaFormState = {}

/**
 * Form de edição de categoria para dentro do Sheet.
 * Reusa a MESMA action `editarCategoria` da edição por página — só o container muda.
 */
export function CategoriaSheetForm({
  categoria,
  onSaved,
}: {
  categoria: Categoria
  onSaved: () => void
}) {
  const editAction = editarCategoria.bind(null, categoria.id)
  const [state, formAction, isPending] = useActionState(editAction, initialState)

  // Ao salvar com sucesso: mostra o feedback por um instante e fecha o Sheet.
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
        <Input
          id="name" name="name" type="text" defaultValue={categoria.name} required disabled={isPending}
          className="border-border bg-muted text-foreground focus-visible:ring-ring"
        />
        {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="description" name="description" rows={3} disabled={isPending}
          defaultValue={categoria.description ?? ''}
          className="flex w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
        />
      </div>

      {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Categoria atualizada com sucesso.</p>}

      <Button type="submit" disabled={isPending} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
