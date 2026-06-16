import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TaskCard } from './task-card'

const TENANT_ID = 'default'

export default async function TarefasDoTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params

  const instance = await prisma.shiftInstance.findUnique({
    where: { id },
    include: {
      shift:      { select: { name: true, start_time: true, end_time: true } },
      shift_tasks: {
        include: {
          assignee:  { select: { id: true, name: true } },
          creator:   { select: { name: true } },
          completer: { select: { name: true } },
          photos:    { select: { id: true, original_name: true } },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/operador/turnos')

  const total   = instance.shift_tasks.length
  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length
  const isOpen  = instance.status !== 'CLOSED'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Tarefas do turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{done} de {total} concluída(s)</span>
              {pending > 0 && (
                <span className="text-amber-400">{pending} pendente(s)</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista de tarefas */}
        {total === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center">
            <p className="text-sm text-slate-500">Nenhuma tarefa atribuída a este turno.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instance.shift_tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  id:               task.id,
                  title:            task.title,
                  description:      task.description,
                  status:           task.status,
                  assigned_to_id:   task.assigned_to_id,
                  assignee:         task.assignee,
                  creator:          task.creator,
                  completer:        task.completer,
                  completed_at:     task.completed_at,
                  completion_notes: task.completion_notes,
                  photos:           task.photos,
                }}
                isShiftOpen={isOpen}
              />
            ))}
          </div>
        )}

    </main>
  )
}
