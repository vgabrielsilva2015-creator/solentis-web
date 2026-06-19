import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:        'Agendado',
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguard. confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:        'bg-blue-950/60 text-blue-400 border-blue-900/50',
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDatetime(d: Date): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciasTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageStr } = await searchParams
  const page  = Math.max(1, parseInt(pageStr ?? '1', 10))
  const take  = 20
  const skip  = (page - 1) * take

  const where = {
    tenant_id: (await getTenantId()),
    ...(status ? { status } : {}),
  }

  const [instances, total] = await Promise.all([
    prisma.shiftInstance.findMany({
      where,
      include: {
        shift:  { select: { name: true } },
        opener: { select: { name: true } },
        handover: {
          select: {
            id:               true,
            status:           true,
            outgoing_user:    { select: { name: true } },
            incoming_user:    { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { opened_at: 'desc' }],
      take,
      skip,
    }),
    prisma.shiftInstance.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  const STATUS_FILTERS = [
    { label: 'Todos',              value: '' },
    { label: 'Agendados',          value: 'SCHEDULED' },
    { label: 'Abertos',            value: 'OPEN' },
    { label: 'Em passagem',        value: 'HANDOVER_PENDING' },
    { label: 'Fechados',           value: 'CLOSED' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Tarefas do Turno</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{total} registro(s)</span>
          <Link href="/gestor/turnos/tarefas/pre-agendar">
            <Button className="bg-blue-700 text-white hover:bg-blue-600 text-xs h-8">
              + Pré-agendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = (status ?? '') === f.value
          const params   = f.value ? `?status=${f.value}` : '?'
          return (
            <Link
              key={f.value}
              href={`/gestor/turnos/tarefas${params}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-slate-100'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {instances.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
          <p className="text-sm text-slate-500">Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => (
            <Link
              key={inst.id}
              href={`/gestor/turnos/tarefas/${inst.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{inst.shift.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDate(inst.date)}
                    {inst.status === 'SCHEDULED'
                      ? ` · Agendado por ${inst.opener.name}`
                      : ` · Aberto por ${inst.opener.name} às ${formatDatetime(inst.opened_at)}`
                    }
                  </p>
                  {inst.handover && (
                    <p className="text-xs text-slate-600">
                      Sainte: {inst.handover.outgoing_user.name}
                      {inst.handover.incoming_user && ` → Entrante: ${inst.handover.incoming_user.name}`}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? 'bg-slate-800 text-slate-400'}`}>
                  {STATUS_LABEL[inst.status] ?? inst.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={`/gestor/turnos/tarefas?${status ? `status=${status}&` : ''}page=${page - 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <Link
            href={`/gestor/turnos/tarefas?${status ? `status=${status}&` : ''}page=${page + 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            Próximo →
          </Link>
        </div>
      )}
    </div>
  )
}

