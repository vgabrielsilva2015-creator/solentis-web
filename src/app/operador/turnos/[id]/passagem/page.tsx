import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { HandoverForm } from './handover-form'
import { getTenantId } from '@/lib/tenant'


export default async function PassagemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const instance = await prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: { select: { id: true } },
      _count: {
        select: {
          readings: true,
        },
      },
    },
  })

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/operador/turnos')
  if (instance.status !== 'OPEN')  redirect('/operador/turnos')
  if (instance.handover)           redirect('/operador/turnos')

  const [openOccurrencesCount, pendingTasksCount] = await Promise.all([
    prisma.occurrence.count({
      where: { tenant_id: (await getTenantId()), status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.count({
      where: { tenant_id: (await getTenantId()), shift_instance_id: id, status: 'PENDING' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Passagem de turno</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Resumo automático */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumo do turno</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-foreground">{instance._count.readings}</p>
              <p className="text-xs text-muted-foreground">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', openOccurrencesCount > 0 ? 'text-amber-400' : 'text-foreground'].join(' ')}>
                {openOccurrencesCount}
              </p>
              <p className="text-xs text-muted-foreground">ocorrência(s)</p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', pendingTasksCount > 0 ? 'text-red-400' : 'text-foreground'].join(' ')}>
                {pendingTasksCount}
              </p>
              <p className="text-xs text-muted-foreground">tarefa(s) pend.</p>
            </div>
          </div>
          {pendingTasksCount > 0 && (
            <p className="text-xs text-red-400 text-center">
              Há tarefas não concluídas — elas aparecerão no checklist do próximo operador.
            </p>
          )}
        </div>

        <HandoverForm instanceId={id} />

    </main>
  )
}
