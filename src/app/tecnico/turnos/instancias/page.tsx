import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const TENANT_ID = 'default'

function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Passagem pendente',
  CLOSED:           'Fechado',
}
const STATUS_COLOR: Record<string, string> = {
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

export default async function TecnicoInstanciasPage() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const instances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: TENANT_ID,
      date:      { gte: today },
    },
    include: {
      shift:  { select: { name: true, start_time: true, end_time: true } },
      opener: { select: { name: true } },
      _count: { select: { shift_tasks: true } },
    },
    orderBy: { opened_at: 'desc' },
    take: 20,
  })

  const pendingByInstance = await prisma.shiftTask.groupBy({
    by:     ['shift_instance_id'],
    where:  { tenant_id: TENANT_ID, status: 'PENDING', shift_instance_id: { in: instances.map((i) => i.id) } },
    _count: { _all: true },
  })
  const pendingMap = Object.fromEntries(pendingByInstance.map((r) => [r.shift_instance_id, r._count._all]))

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">Turnos — Atribuir tarefas</h1>

        {instances.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
            <p className="text-sm text-slate-500">Nenhum turno encontrado hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const pending = pendingMap[inst.id] ?? 0
              return (
                <div
                  key={inst.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        {inst.shift.start_time} – {inst.shift.end_time} · aberto por {inst.opener.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDatetime(inst.opened_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? ''}`}>
                      {STATUS_LABEL[inst.status] ?? inst.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      {inst._count.shift_tasks} tarefa(s) ·{' '}
                      {pending > 0
                        ? <span className="text-amber-400">{pending} pendente(s)</span>
                        : <span className="text-slate-600">nenhuma pendente</span>
                      }
                    </span>
                    <Link href={`/tecnico/turnos/instancias/${inst.id}`}>
                      <Button className="h-8 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
                        Gerenciar tarefas
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

    </main>
  )
}
