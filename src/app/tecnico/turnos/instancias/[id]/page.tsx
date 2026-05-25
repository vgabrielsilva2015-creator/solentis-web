import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TecnicoTaskForm } from './tecnico-task-form'

const TENANT_ID = 'default'

export default async function TecnicoInstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login')

  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findUnique({
      where: { id },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
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
      where:   { tenant_id: TENANT_ID, role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/tecnico/turnos/instancias')

  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">Solentis</span>
          <span className="rounded-full bg-blue-900/60 px-2.5 py-0.5 text-xs font-medium text-blue-400">
            Técnico
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · aberto por {instance.opener.name}
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',     value: instance.shift_tasks.length,  color: 'text-slate-100' },
            { label: 'Pendentes', value: pending,                        color: pending > 0 ? 'text-amber-400' : 'text-slate-100' },
            { label: 'Concluídas',value: done,                           color: done > 0 ? 'text-green-400' : 'text-slate-100' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tarefas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <TecnicoTaskForm
            instanceId={id}
            operators={operators}
            tasks={instance.shift_tasks}
            canAdd={instance.status !== 'CLOSED'}
          />
        </div>

        <div className="pt-2">
          <Link href="/tecnico/turnos/instancias" className="text-xs text-slate-600 hover:text-slate-400">
            ← Voltar
          </Link>
        </div>
      </main>
    </div>
  )
}
