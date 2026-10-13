'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { encerrarTurnoForcado } from '../actions'
import type { EncerrarForcadoFormState } from '../actions'

const INITIAL: EncerrarForcadoFormState = {}

type Props = { instanceId: string }

export function ForceCloseForm({ instanceId }: Props) {
  const [aberto, setAberto] = useState(false)
  const action = encerrarTurnoForcado.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  if (state.success) {
    return <p className="text-xs text-green-400 py-1">Turno encerrado à força com sucesso.</p>
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        onClick={() => setAberto(true)}
        className="h-9 w-full border border-red-900/50 bg-red-950/40 text-red-400 hover:bg-red-950/60 text-xs"
      >
        Encerrar à força
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Justificativa do encerramento <span className="text-red-400">*</span>
        </label>
        <textarea
          name="justification"
          rows={3}
          required
          autoComplete="off"
          placeholder="Explique por que o turno está sendo encerrado à força (mín. 10 caracteres). Fica registrado na auditoria."
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-red-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.justification && (
          <p className="text-xs text-red-400">{state.fieldErrors.justification[0]}</p>
        )}
      </div>

      {state.error && <p className="text-xs text-red-400">{state.error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => setAberto(false)}
          disabled={isPending}
          className="h-9 flex-1 border border-border bg-muted text-foreground hover:bg-secondary text-xs"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 flex-1 border border-red-900/50 bg-red-950/50 text-red-300 hover:bg-red-950/70 text-xs"
        >
          {isPending ? 'Encerrando…' : 'Confirmar encerramento'}
        </Button>
      </div>
    </form>
  )
}
