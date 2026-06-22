'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolverOcorrencia, type ResolucaoFormState } from '@/app/tecnico/ocorrencias/actions'
import { Button } from '@/components/ui/button'

const INITIAL: ResolucaoFormState = {}

export function ResolveForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const router      = useRouter()
  const boundAction = resolverOcorrencia.bind(null, ocorrenciaId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-4 border-t border-slate-800">
      <h3 className="text-sm font-semibold text-slate-300">Fechar ocorrência</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="resolution_notes" className="text-xs font-medium text-slate-400">
          Resolução adotada *
        </label>
        <textarea
          id="resolution_notes" name="resolution_notes"
          rows={4}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva como a ocorrência foi resolvida…"
        />
        {state.fieldErrors?.resolution_notes && (
          <p className="text-xs text-red-400">{state.fieldErrors.resolution_notes[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
      >
        {isPending ? 'Fechando…' : 'Confirmar resolução'}
      </Button>
    </form>
  )
}
