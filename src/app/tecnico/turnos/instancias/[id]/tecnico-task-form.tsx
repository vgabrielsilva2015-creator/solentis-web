'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
// actions ficam no path do Gestor — import compartilhado conforme decisão de arquitetura
import { atribuirTarefa, removerTarefa, type TaskFormState } from '@/app/gestor/turnos/instancias/[id]/task-actions'

const INITIAL: TaskFormState = {}

type Operator = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  assignee: { name: string } | null
  creator: { name: string }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE:    'Concluída',
  SKIPPED: 'Pulada',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-slate-700 bg-slate-800/60 text-slate-400',
  DONE:    'border-green-900/50 bg-green-950/60 text-green-400',
  SKIPPED: 'border-slate-700/50 bg-slate-800/30 text-slate-500',
}

export function TecnicoTaskForm({
  instanceId,
  operators,
  tasks,
  canAdd,
}: {
  instanceId: string
  operators:  Operator[]
  tasks:      Task[]
  canAdd:     boolean
}) {
  const boundAction = atribuirTarefa.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {task.assignee ? `→ ${task.assignee.name}` : 'Qualquer operador'} · por {task.creator.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
                {task.status === 'PENDING' && canAdd && (
                  <form action={removerTarefa.bind(null, task.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-medium text-slate-400">Nova tarefa</p>

          <div>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Título da tarefa *"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-400">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Descrição opcional"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <select
            name="assigned_to_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Qualquer operador</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          {state.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full bg-slate-100 text-sm text-slate-900 hover:bg-white"
          >
            {isPending ? 'Salvando…' : '+ Atribuir tarefa'}
          </Button>
        </form>
      )}
    </div>
  )
}
