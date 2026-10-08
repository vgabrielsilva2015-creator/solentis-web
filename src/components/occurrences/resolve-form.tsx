'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolverOcorrencia, type ResolucaoFormState } from '@/app/tecnico/ocorrencias/actions'
import { RESOLUCAO_MIN } from '@/lib/occurrence-resolution'
import { Button } from '@/components/ui/button'

const INITIAL: ResolucaoFormState = {}

/**
 * Resolver ocorrência — o mesmo formulário nas telas do operador, do técnico e
 * do gestor (T-20). A ação tomada é obrigatória; a foto de evidência é opcional.
 * Quem resolveu, data e hora são gravados pelo servidor.
 */
export function ResolveForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const router      = useRouter()
  const boundAction = resolverOcorrencia.bind(null, ocorrenciaId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-4 border-t border-border">
      <h3 className="text-sm font-semibold text-foreground">Resolver ocorrência</h3>

      {state.error && (
        <p role="alert" className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="resolution_notes" className="text-xs font-medium text-muted-foreground">
          O que foi feito para resolver? *
        </label>
        <textarea
          id="resolution_notes" name="resolution_notes"
          rows={4}
          minLength={RESOLUCAO_MIN}
          required
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Ex.: troquei a gaxeta da bomba B2 e testei por 10 minutos sem vazamento."
        />
        {state.fieldErrors?.resolution_notes && (
          <p className="text-xs text-red-400">{state.fieldErrors.resolution_notes[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="evidence" className="text-xs font-medium text-muted-foreground">
          Foto da evidência (opcional)
        </label>
        <input
          id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp"
          className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-foreground"
        />
        {state.fieldErrors?.evidence && (
          <p className="text-xs text-red-400">{state.fieldErrors.evidence[0]}</p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">Fica registrado com o seu nome, a data e a hora.</p>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
      >
        {isPending ? 'Registrando…' : 'Confirmar resolução'}
      </Button>
    </form>
  )
}
