'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarCorretiva, type CorretivaFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'

const INITIAL: CorretivaFormState = {}

export function CorrectiveForm({ equipamentoId }: { equipamentoId: string }) {
  const router = useRouter()
  const boundAction = registrarCorretiva.bind(null, equipamentoId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-3 border-t border-slate-800">
      <h3 className="text-sm font-medium text-slate-300">Registrar corretiva</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium text-slate-400">Descrição do problema *</label>
        <textarea
          id="description" name="description" rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o problema observado…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prioridade */}
        <div className="space-y-1">
          <label htmlFor="priority" className="text-xs font-medium text-slate-400">Prioridade *</label>
          <select
            id="priority" name="priority"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Selecione…</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
          {state.fieldErrors?.priority && (
            <p className="text-xs text-red-400">{state.fieldErrors.priority[0]}</p>
          )}
        </div>

        {/* Data de início */}
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-xs font-medium text-slate-400">Data de início *</label>
          <input
            id="start_date" name="start_date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state.fieldErrors?.start_date && (
            <p className="text-xs text-red-400">{state.fieldErrors.start_date[0]}</p>
          )}
        </div>
      </div>

      {/* Custo estimado */}
      <div className="space-y-1">
        <label htmlFor="estimated_cost" className="text-xs font-medium text-slate-400">
          Custo estimado (R$) <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <input
          id="estimated_cost" name="estimated_cost"
          type="number" step="0.01" min="0"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="0,00"
        />
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <label htmlFor="notes" className="text-xs font-medium text-slate-400">
          Observações <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <textarea
          id="notes" name="notes" rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Informações adicionais…"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-slate-100 text-slate-900 hover:bg-white text-sm disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Registrar corretiva'}
      </Button>
    </form>
  )
}
