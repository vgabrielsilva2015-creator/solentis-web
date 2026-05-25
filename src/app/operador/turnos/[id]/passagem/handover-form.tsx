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
        <label className="text-sm font-medium text-slate-300">
          Itens pendentes
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="pending_items"
          rows={3}
          placeholder="Ex: Bomba B2 com vibração anormal, aguardando manutenção"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Observações do turno
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="outgoing_observations"
          rows={3}
          placeholder="Informações relevantes para o próximo operador"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

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
