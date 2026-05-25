import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { HandoverForm } from './handover-form'

const TENANT_ID = 'default'

export default async function PassagemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const instance = await prisma.shiftInstance.findUnique({
    where: { id },
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

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/operador/turnos')
  if (instance.status !== 'OPEN')  redirect('/operador/turnos')
  if (instance.handover)           redirect('/operador/turnos')

  const [openOccurrencesCount, pendingTasksCount] = await Promise.all([
    prisma.occurrence.count({
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.count({
      where: { tenant_id: TENANT_ID, shift_instance_id: id, status: 'PENDING' },
    }),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">Solentis</span>
          <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Operador
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Passagem de turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Resumo automático */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{instance._count.readings}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', openOccurrencesCount > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {openOccurrencesCount}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', pendingTasksCount > 0 ? 'text-red-400' : 'text-slate-100'].join(' ')}>
                {pendingTasksCount}
              </p>
              <p className="text-xs text-slate-500">tarefa(s) pend.</p>
            </div>
          </div>
          {pendingTasksCount > 0 && (
            <p className="text-xs text-red-400 text-center">
              Há tarefas não concluídas — elas aparecerão no checklist do próximo operador.
            </p>
          )}
        </div>

        <HandoverForm instanceId={id} />

        <div className="pt-2">
          <Link href="/operador/turnos" className="text-xs text-slate-600 hover:text-slate-400">
            ← Cancelar
          </Link>
        </div>
      </main>
    </div>
  )
}
