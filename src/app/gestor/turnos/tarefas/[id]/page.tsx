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
  CLOSED:           'bg-muted/60 text-muted-foreground border-border/50',
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
            photos:   { select: { id: true, original_name: true } },
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

  const checklist = (h ? JSON.parse((h.checklist_data as string) || '{}') : {}) as {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos/tarefas" label="Tarefas do Turno" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · {formatDatetime(instance.date)}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[instance.status] ?? ''}`}>
          {STATUS_LABEL[instance.status] ?? instance.status}
        </span>
      </div>

      {/* Dados da instância */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarefa</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-muted-foreground">Aberto por</span>
            <p className="text-foreground">{instance.opener.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Abertura</span>
            <p className="text-foreground">{formatDatetime(instance.opened_at)}</p>
          </div>
          {instance.closed_at && (
            <div>
              <span className="text-muted-foreground">Fechamento</span>
              <p className="text-foreground">{formatDatetime(instance.closed_at)}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Leituras</span>
            <p className="text-foreground">{instance.readings.length}</p>
          </div>
        </div>
      </div>

      {/* Tarefas do turno */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarefas</p>
          <span className="text-xs text-muted-foreground">
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Passagem</p>
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
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <p className="text-xl font-bold">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${(checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Pendências</p>
              <p className="text-xs text-foreground">{checklist.pending_items}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">Sainte</span>
              <p className="text-foreground">{h.outgoing_user.name}</p>
            </div>
            {h.incoming_user && (
              <div>
                <span className="text-muted-foreground">Entrante</span>
                <p className="text-foreground">{h.incoming_user.name}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Iniciada em</span>
              <p className="text-foreground">{formatDatetime(h.handover_at)}</p>
            </div>
            {h.confirmed_at && (
              <div>
                <span className="text-muted-foreground">Confirmada em</span>
                <p className="text-foreground">{formatDatetime(h.confirmed_at)}</p>
              </div>
            )}
          </div>

          {h.outgoing_observations && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Observações do sainte</p>
              <p className="text-xs text-foreground rounded-lg bg-muted/40 px-3 py-2">{h.outgoing_observations}</p>
            </div>
          )}
          {h.incoming_observations && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Observações do entrante</p>
              <p className="text-xs text-foreground rounded-lg bg-muted/40 px-3 py-2">{h.incoming_observations}</p>
            </div>
          )}

          {/* Formulário de edição — apenas passagens confirmadas */}
          {h.status === 'CONFIRMED' && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-3">Editar observações</p>
              <EditHandoverForm
                handoverId={h.id}
                currentOutgoing={h.outgoing_observations ?? ''}
                currentIncoming={h.incoming_observations ?? ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhuma passagem registrada.</p>
        </div>
      )}
    </div>
  )
}
