import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 20

import { SEVERITY_LABEL, SEVERITY_COLOR, OCCURRENCE_STATUS_LABEL } from '@/lib/labels'

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, filter } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const userId = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })

  if (!userId) redirect('/login')

  const where: any = { tenant_id: (await getTenantId()), reported_by: userId.id }
  if (filter === 'open') {
    where.status = { in: ['OPEN', 'IN_PROGRESS'] }
  } else if (filter === 'resolved') {
    where.status = 'RESOLVED'
  } else if (filter === 'high') {
    where.severity = { in: ['HIGH', 'CRITICAL'] }
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        photos: { select: { id: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/operador/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href="/operador/ocorrencias" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${!filter ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Todas
          </Link>
          <Link href="/operador/ocorrencias?filter=open" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'open' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Abertas
          </Link>
          <Link href="/operador/ocorrencias?filter=high" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'high' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Alta Prioridade
          </Link>
          <Link href="/operador/ocorrencias?filter=resolved" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'resolved' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Resolvidas
          </Link>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma ocorrência registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((oc) => {
              const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
              const hasPhoto     = oc.photos.length > 0

              return (
                <div
                  key={oc.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-2',
                    prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  {/* Linha superior: badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                      </span>
                      {prazoVencido && (
                        <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                          PRAZO VENCIDO
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {OCCURRENCE_STATUS_LABEL[oc.status] ?? oc.status}
                    </span>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                  {/* Rodapé: data + prazo + foto */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{formatDatetime(oc.created_at)}</span>
                    <div className="flex items-center gap-2">
                      {hasPhoto && (
                        <Link
                          href={`/api/occurrences/${oc.id}/photo`}
                          target="_blank"
                          className="text-sky-500 hover:text-sky-400"
                        >
                          Ver foto
                        </Link>
                      )}
                      <span className={prazoVencido ? 'text-red-400' : ''}>
                        Prazo: {formatDatetime(oc.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/operador/ocorrencias?page=${page - 1}`} className="text-slate-400 hover:text-slate-200">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/operador/ocorrencias?page=${page + 1}`} className="text-slate-400 hover:text-slate-200">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

      </main>
  )
}
