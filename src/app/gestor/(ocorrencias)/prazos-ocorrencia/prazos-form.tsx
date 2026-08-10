'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { atualizarPrazos, type PrazosFormState } from './actions'

const ORDERED = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const initialState: PrazosFormState = {}

type Props = {
  initialValues:  Record<string, number>
  severityLabels: Record<string, { label: string; color: string }>
}

export function PrazosForm({ initialValues, severityLabels }: Props) {
  const [state, formAction, isPending] = useActionState(atualizarPrazos, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        {ORDERED.map((severity) => {
          const { label, color } = severityLabels[severity]
          return (
            <div key={severity} className="flex items-center gap-4">
              <span className={`w-20 text-sm font-medium ${color}`}>{label}</span>
              <div className="flex items-center gap-2">
                <Input
                  name={`deadline_${severity}`}
                  type="number"
                  min={1}
                  defaultValue={initialValues[severity] ?? ''}
                  required
                  disabled={isPending}
                  className="w-28 border-border bg-muted text-foreground focus-visible:ring-ring"
                />
                <span className="text-sm text-muted-foreground">horas</span>
              </div>
            </div>
          )
        })}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Prazos atualizados com sucesso.
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar prazos'}
      </Button>
    </form>
  )
}
