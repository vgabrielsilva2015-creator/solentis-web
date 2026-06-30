import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EditHandoverForm } from './edit-handover-form'
import { TaskForm } from './task-form'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:        'Agendado',
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:        'bg-blue-950/60 text-blue-400 border-blue-900/50',
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

const HANDOVER_STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando confirmação',
  CONFIRMED: 'Confirmada',
  TIMED_OUT: 'Timeout',
}

function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
        handover: {
          include: {
            outgoing_user: { select: { name: true } },
            incoming_user: { select: { name: true } },
          },
        },
        readings:    { select: { id: true } },
        shift_tasks: {
          include: {
            assignee: { select: { name: true } },
            creator:  { select: { name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where:   { tenant_id: (await getTenantId()), role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/gestor/turnos/tarefas')

  const h = instance.handover

  const checklist = h ? (h.checklist_data as {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  }) ?? {} : {}

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos/tarefas" label="Tarefas do Turno" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · {formatDatetime(instance.date)}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[instance.status] ?? ''}`}>
          {STATUS_LABEL[instance.status] ?? instance.status}
        </span>
      </div>

      {/* Dados da instância */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefa</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-slate-500">Aberto por</span>
            <p className="text-slate-200">{instance.opener.name}</p>
          </div>
          <div>
            <span className="text-slate-500">Abertura</span>
            <p className="text-slate-200">{formatDatetime(instance.opened_at)}</p>
          </div>
          {instance.closed_at && (
            <div>
              <span className="text-slate-500">Fechamento</span>
              <p className="text-slate-200">{formatDatetime(instance.closed_at)}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Leituras</span>
            <p className="text-slate-200">{instance.readings.length}</p>
          </div>
        </div>
      </div>

      {/* Tarefas do turno */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <span className="text-xs text-slate-500">
            {instance.shift_tasks.filter((t) => t.status === 'DONE').length}
            /{instance.shift_tasks.length} concluídas
          </span>
        </div>
        <TaskForm
          instanceId={id}
          operators={operators}
          tasks={instance.shift_tasks}
          canAdd={instance.status !== 'CLOSED'}
        />
      </div>

      {/* Passagem de turno */}
      {h ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Passagem</p>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              h.status === 'CONFIRMED'  ? 'bg-green-950/60 text-green-400'  :
              h.status === 'TIMED_OUT' ? 'bg-red-950/60 text-red-400'      :
                                         'bg-amber-950/60 text-amber-400'
            }`}>
              {HANDOVER_STATUS_LABEL[h.status] ?? h.status}
            </span>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-xl font-bold">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${(checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Pendências</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div>
              <span className="text-slate-500">Sainte</span>
              <p className="text-slate-200">{h.outgoing_user.name}</p>
            </div>
            {h.incoming_user && (
              <div>
                <span className="text-slate-500">Entrante</span>
                <p className="text-slate-200">{h.incoming_user.name}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">Iniciada em</span>
              <p className="text-slate-200">{formatDatetime(h.handover_at)}</p>
            </div>
            {h.confirmed_at && (
              <div>
                <span className="text-slate-500">Confirmada em</span>
                <p className="text-slate-200">{formatDatetime(h.confirmed_at)}</p>
              </div>
            )}
          </div>

          {h.outgoing_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.outgoing_observations}</p>
            </div>
          )}
          {h.incoming_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do entrante</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.incoming_observations}</p>
            </div>
          )}

          {/* Formulário de edição — apenas passagens confirmadas */}
          {h.status === 'CONFIRMED' && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 mb-3">Editar observações</p>
              <EditHandoverForm
                handoverId={h.id}
                currentOutgoing={h.outgoing_observations ?? ''}
                currentIncoming={h.incoming_observations ?? ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center py-8">
          <p className="text-sm text-slate-500">Nenhuma passagem registrada.</p>
        </div>
      )}
    </div>
  )
}
