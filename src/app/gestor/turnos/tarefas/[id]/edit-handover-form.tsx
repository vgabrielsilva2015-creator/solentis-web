'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { editarPassagem } from '../actions'
import type { EditHandoverFormState } from '../actions'

const INITIAL: EditHandoverFormState = {}

type Props = {
  handoverId:      string
  currentOutgoing: string
  currentIncoming: string
}

export function EditHandoverForm({ handoverId, currentOutgoing, currentIncoming }: Props) {
  const action = editarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  if (state.success) {
    return (
      <p className="text-xs text-green-400 py-2">Observações atualizadas com sucesso.</p>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do sainte</label>
        <textarea
          name="outgoing_observations"
          rows={2}
          defaultValue={currentOutgoing}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do entrante</label>
        <textarea
          name="incoming_observations"
          rows={2}
          defaultValue={currentIncoming}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">
          Justificativa da edição <span className="text-red-400">*</span>
        </label>
        <textarea
          name="justification"
          rows={2}
          required
          placeholder="Descreva o motivo da edição (mín. 10 caracteres)"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.justification && (
          <p className="text-xs text-red-400">{state.fieldErrors.justification[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-9 w-full border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
