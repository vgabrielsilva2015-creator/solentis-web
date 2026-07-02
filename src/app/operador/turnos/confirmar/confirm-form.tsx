'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarPassagem } from '../actions'
import type { TurnoFormState } from '../actions'

const INITIAL: TurnoFormState = {}

export function ConfirmForm({ handoverId }: { handoverId: string }) {
  const router = useRouter()
  const action = confirmarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Suas observações
          <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          name="incoming_observations"
          rows={3}
          placeholder="Observações sobre o recebimento do turno"
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Confirmando…' : 'Confirmar recebimento do turno'}
      </Button>
    </form>
  )
}
