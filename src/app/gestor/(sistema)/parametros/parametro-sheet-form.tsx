'use client'

import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarParametro, carregarParametro, type ParametroFormState } from './actions'

type Parametro = {
  id:              string
  name:            string
  unit:            string
  min_limit:       number | null
  max_limit:       number | null
  legal_reference: string | null
  effective_date:  Date
  is_active:       boolean
  method?:         { name: string } | null
  collection_points?: { name: string }[]
}

const initialState: ParametroFormState = {}

/**
 * Carrega o parâmetro completo (método + pontos) sob demanda ao abrir o Sheet,
 * depois renderiza o form. Evita inchar a query da listagem.
 */
export function ParametroSheetLoader({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [parametro, setParametro] = useState<Parametro | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let ativo = true
    carregarParametro(id)
      .then((p) => { if (ativo) p ? setParametro(p) : setErro(true) })
      .catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false }
  }, [id])

  if (erro) return <p className="text-sm text-red-400">Não foi possível carregar o parâmetro.</p>
  if (!parametro) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }
  return <ParametroSheetForm parametro={parametro} onSaved={onSaved} />
}

/** Form de edição de parâmetro para dentro do Sheet. Reusa a action `editarParametro`. */
function ParametroSheetForm({ parametro, onSaved }: { parametro: Parametro; onSaved: () => void }) {
  const editAction = editarParametro.bind(null, parametro.id)
  const [state, formAction, isPending] = useActionState(editAction, initialState)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onSaved, 700)
      return () => clearTimeout(t)
    }
  }, [state.success, onSaved])

  const effectiveDateStr = parametro.effective_date.toISOString().split('T')[0]

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
          <Input id="name" name="name" type="text" defaultValue={parametro.name} required disabled={isPending}
            className="border-border bg-muted text-foreground focus-visible:ring-ring" />
          {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="unit" className="text-sm font-medium text-foreground">Unidade</label>
          <Input id="unit" name="unit" type="text" defaultValue={parametro.unit} placeholder="mg/L, NTU, pH…" required disabled={isPending}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
          {state.fieldErrors?.unit && <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="min_limit" className="text-sm font-medium text-foreground">
            Limite mínimo <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input id="min_limit" name="min_limit" type="number" step="0.01" inputMode="decimal"
            defaultValue={parametro.min_limit ?? ''} disabled={isPending}
            className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="max_limit" className="text-sm font-medium text-foreground">
            Limite máximo <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input id="max_limit" name="max_limit" type="number" step="0.01" inputMode="decimal"
            defaultValue={parametro.max_limit ?? ''} disabled={isPending}
            className="border-border bg-muted text-foreground focus-visible:ring-ring" />
          {state.fieldErrors?.max_limit && <p className="text-xs text-red-400">{state.fieldErrors.max_limit[0]}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="legal_reference" className="text-sm font-medium text-foreground">
          Referência legal <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <Input id="legal_reference" name="legal_reference" type="text" defaultValue={parametro.legal_reference ?? ''}
          placeholder="Ex: CONAMA 430/2011 Art. 16" disabled={isPending}
          className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="default_method_name" className="text-sm font-medium text-foreground">
            Método Padrão <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Input id="default_method_name" name="default_method_name" type="text" defaultValue={parametro.method?.name ?? ''}
            placeholder="Ex: SM 4500-H+ B" disabled={isPending}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="collection_points" className="text-sm font-medium text-foreground">
            Pontos de Coleta <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Input id="collection_points" name="collection_points" type="text"
            defaultValue={parametro.collection_points?.map((p) => p.name).join(', ') ?? ''}
            placeholder="Separe por vírgula (ex: Tanque 1, Entrada)" disabled={isPending}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="effective_date" className="text-sm font-medium text-foreground">Data de vigência</label>
        <Input id="effective_date" name="effective_date" type="date" defaultValue={effectiveDateStr} required disabled={isPending}
          className="border-border bg-muted text-foreground focus-visible:ring-ring" />
        {state.fieldErrors?.effective_date && <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>}
      </div>

      {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Parâmetro atualizado com sucesso.</p>}

      <Button type="submit" disabled={isPending} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
