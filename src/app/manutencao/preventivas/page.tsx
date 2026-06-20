import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default async function PreventivasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }),
  }

  const [preventivas, total] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      where,
      include: {
        equipment: { select: { name: true, location: true } },
        completer: { select: { name: true } }
      },
      orderBy: [{ scheduled_date: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.preventiveMaintenance.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Manutenções Preventivas</h1>
          <p className="text-xs text-slate-400">{total} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/manutencao/preventivas"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              !showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Pendentes
          </Link>
          <Link
            href="/manutencao/preventivas?status=all"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Tabela */}
      {preventivas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
          Nenhuma preventiva agendada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Agendamento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Realizada Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {preventivas.map((prev) => {
                const atrasado = prev.status !== 'COMPLETED' && new Date(prev.scheduled_date) < now

                return (
                  <tr key={prev.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium">{prev.equipment.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{prev.equipment.location || 'Sem localização'}</p>
                    </td>
                    <td className={`px-4 py-3 ${atrasado ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                      {formatDatetime(prev.scheduled_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {prev.status === 'COMPLETED' ? (
                          <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                            Concluída
                          </span>
                        ) : prev.status === 'IN_PROGRESS' ? (
                          <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                            Em Andamento
                          </span>
                        ) : (
                          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            Agendada
                          </span>
                        )}
                        {atrasado && (
                          <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                            ATRASADA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {prev.completer ? prev.completer.name : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          {page > 1 ? (
            <Link
              href={`/manutencao/preventivas?page=${page - 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Anterior
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/manutencao/preventivas?page=${page + 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              Próxima →
            </Link>
          ) : <span />}
        </div>
      )}
    </main>
  )
}
