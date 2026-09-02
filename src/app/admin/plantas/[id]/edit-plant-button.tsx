'use client'

import { useActionState, useEffect, useState } from 'react'
import { Pencil, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarPlanta, type EditPlantaFormState } from '../actions'

const initialState: EditPlantaFormState = {}

export function EditPlantButton({
  tenantId,
  tenantName,
  tenantSlug,
}: {
  tenantId: string
  tenantName: string
  tenantSlug: string
}) {
  const [open, setOpen] = useState(false)
  const salvar = editarPlanta.bind(null, tenantId)
  const [state, formAction, isPending] = useActionState(salvar, initialState)

  // Fecha o modal quando o salvamento dá certo (revalidatePath atualiza a tela).
  useEffect(() => {
    if (state.success) setOpen(false)
  }, [state.success])

  function close() {
    if (isPending) return
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Editar planta</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={close}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-foreground">Nome da planta</label>
                <Input
                  id="name" name="name" type="text" defaultValue={tenantName}
                  required disabled={isPending}
                  className="border-border bg-muted text-foreground"
                />
                {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="slug" className="text-sm font-medium text-foreground">Slug (identificador)</label>
                <Input
                  id="slug" name="slug" type="text" defaultValue={tenantSlug}
                  required disabled={isPending}
                  className="border-border bg-muted font-mono text-foreground"
                />
                <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
                {state.fieldErrors?.slug && <p className="text-xs text-red-400">{state.fieldErrors.slug[0]}</p>}
              </div>

              {state.error && (
                <p className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close} disabled={isPending} className="h-9 text-xs">
                  Cancelar
                </Button>
                <Button
                  type="submit" disabled={isPending}
                  className="h-9 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
