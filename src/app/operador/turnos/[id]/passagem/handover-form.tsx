'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { iniciarPassagem } from '../../actions'
import type { TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

export function HandoverForm({ instanceId }: { instanceId: string }) {
  const router = useRouter()
  const action = iniciarPassagem.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Itens pendentes
          <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          name="pending_items"
          rows={3}
          placeholder="Ex: Bomba B2 com vibração anormal, aguardando manutenção"
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Observações do turno *
        </label>
        <textarea
          name="outgoing_observations"
          rows={3}
          placeholder="Ex: Turno ocorreu sem grandes anormalidades. Atenção ao equipamento X..."
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.outgoing_observations && (
          <p className="text-xs text-red-400">{state.fieldErrors.outgoing_observations[0]}</p>
        )}
      </div>

      <div className="flex items-start gap-2 pt-2">
        <input 
          type="checkbox" 
          id="confirm" 
          name="confirm" 
          className="mt-1 shrink-0 rounded border-border bg-muted text-emerald-600 focus:ring-emerald-600 focus:ring-offset-background" 
        />
        <label htmlFor="confirm" className="text-sm text-foreground">
          Declaro que as informações estão corretas e o turno está pronto para ser repassado. *
        </label>
      </div>
      {state.fieldErrors?.confirm && (
        <p className="text-xs text-red-400">{state.fieldErrors.confirm[0]}</p>
      )}

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-amber-700 hover:bg-amber-600 text-white text-sm"
      >
        {isPending ? 'Iniciando passagem…' : 'Iniciar passagem de turno'}
      </Button>
    </form>
  )
}
