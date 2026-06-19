import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { aplicarTimeouts } from './actions'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function TurnosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Aplica timeouts pendentes de forma lazy
  await aplicarTimeouts()

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })
  if (!userRecord) redirect('/login')

  const userId = userRecord.id

  // Tarefas ativas (OPEN ou HANDOVER_PENDING) de qualquer data
  // Inclui turnos noturnos (crosses_midnight) abertos ontem e ainda não encerrados
  const activeInstances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: (await getTenantId()),
      status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
    },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: {
        select: {
          id:               true,
          status:           true,
          timeout_at:       true,
          outgoing_user_id: true,
          checklist_data:   true,
          outgoing_user:    { select: { name: true } },
        },
      },
      shift_tasks: {
        where:  { status: 'PENDING' },
        select: { id: true },
      },
    },
    orderBy: { opened_at: 'asc' },
  })

  // Handovers PENDING que este operador pode confirmar (ele não é o sainte)
  const pendingToConfirm = activeInstances.filter(
    (inst) =>
      inst.handover?.status === 'PENDING' &&
      inst.handover.outgoing_user_id !== userId,
  )

  // Turnos que eu abri (e ainda estão OPEN)
  const myOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by === userId,
  )

  // Turnos OPEN de outros — posso também iniciar passagem (qualquer operador pode)
  const otherOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by !== userId,
  )

  const now = new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Turnos</h1>
          <Link href="/operador/turnos/abrir">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Abrir turno
            </Button>
          </Link>
        </div>

        {/* ─── Passagens aguardando minha confirmação ─── */}
        {pendingToConfirm.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-amber-400">Aguardando sua confirmação</h2>
            {pendingToConfirm.map((inst) => {
              const h        = inst.handover!
              const vencido  = new Date(h.timeout_at) < now
              let checklist: {
                readings_count?: number
                open_occurrences_count?: number
                pending_items?: string
                pending_tasks_count?: number
                pending_tasks?: string[]
              } = {}
              try { checklist = JSON.parse(h.checklist_data) } catch { /* ignora */ }

              return (
                <div
                  key={inst.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-3',
                    vencido ? 'border-red-900/60' : 'border-amber-900/60',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        Sainte: {h.outgoing_user.name} · {formatTime(new Date(inst.opened_at))}
                      </p>
                    </div>
                    {vencido && (
                      <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
                        TIMEOUT
                      </span>
                    )}
                  </div>

                  {/* Resumo do checklist */}
                  <div className="rounded-md bg-slate-800/60 px-3 py-2 text-xs text-slate-400 space-y-1">
                    <p>{checklist.readings_count ?? 0} leitura(s) no turno</p>
                    <p>{checklist.open_occurrences_count ?? 0} ocorrência(s) em aberto</p>
                    {(checklist.pending_tasks_count ?? 0) > 0 && (
                      <div className="pt-0.5">
                        <p className="text-amber-400 font-medium">
                          {checklist.pending_tasks_count} tarefa(s) não concluída(s):
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {(checklist.pending_tasks ?? []).map((title, i) => (
                            <li key={i} className="text-slate-300">• {title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {checklist.pending_items && (
                      <p className="text-slate-300">Pendências: {checklist.pending_items}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Prazo de confirmação: {formatDatetime(new Date(h.timeout_at))}
                  </p>

                  <Link href={`/operador/turnos/confirmar?handoverId=${h.id}`}>
                    <Button className="h-11 w-full bg-amber-900/60 text-amber-300 hover:bg-amber-900 border border-amber-900/50 text-sm">
                      Confirmar recebimento
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Meus turnos abertos (posso iniciar passagem) ─── */}
        {myOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Meu turno ativo</h2>
            {myOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      {inst.shift.start_time} – {inst.shift.end_time} · aberto às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {/* Badge de tarefas pendentes */}
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem de turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Outros turnos abertos (outros operadores) ─── */}
        {otherOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Outros turnos ativos</h2>
            {otherOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      Aberto por {inst.opener.name} às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem deste turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Sem atividade ─── */}
        {activeInstances.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center space-y-3">
            <p className="text-sm text-slate-500">Nenhum turno ativo hoje.</p>
            <Link href="/operador/turnos/abrir">
              <Button className="bg-slate-100 text-slate-900 hover:bg-white text-sm h-10 px-6">
                Abrir turno
              </Button>
            </Link>
          </div>
        )}

      </main>
  )
}
