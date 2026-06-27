import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { OccurrencesKanban } from '@/components/occurrences-kanban'
import { LayoutGrid, Table } from 'lucide-react'

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
  searchParams: Promise<{ page?: string; filter?: string; view?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedParams = await searchParams
  const pageParam = resolvedParams.page
  const filter = resolvedParams.filter
  const view = resolvedParams.view || 'list'

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const userId = await resolveUserId(session.user.email!)

  if (!userId) redirect('/login')

  const where: any = { tenant_id: (await getTenantId()), reported_by: userId, deleted_at: null }
  if (filter === 'open') {
    where.status = { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }
  } else if (filter === 'resolved') {
    where.status = 'RESOLVED'
  } else if (filter === 'high') {
    where.severity = { in: ['HIGH', 'CRITICAL'] }
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos: { select: { id: true } },
      },
      orderBy: { created_at: 'desc' },
      take: view === 'list' ? PAGE_SIZE : 100,
      skip: view === 'list' ? skip : undefined,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-xs text-slate-400 mt-1">{total} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <Link href={`/operador/ocorrencias?view=kanban${filter ? `&filter=${filter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'kanban' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Kanban">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/operador/ocorrencias?view=list${filter ? `&filter=${filter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'list' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Lista">
                <Table className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Link href="/operador/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8 font-semibold">
              + Nova
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link href={`/operador/ocorrencias?view=${view}`} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${!filter ? 'bg-slate-100 text-slate-900 border-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
          Todas
        </Link>
        <Link href={`/operador/ocorrencias?filter=open&view=${view}`} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${filter === 'open' ? 'bg-slate-100 text-slate-900 border-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
          Abertas
        </Link>
        <Link href={`/operador/ocorrencias?filter=high&view=${view}`} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${filter === 'high' ? 'bg-slate-100 text-slate-900 border-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
          Alta Prioridade
        </Link>
        <Link href={`/operador/ocorrencias?filter=resolved&view=${view}`} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${filter === 'resolved' ? 'bg-slate-100 text-slate-900 border-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
          Resolvidas
        </Link>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <OccurrencesKanban initialOccurrences={ocorrencias} baseUrl="/operador/ocorrencias" />
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
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
                      'rounded-xl border bg-slate-900 p-4 space-y-3 transition-colors hover:border-slate-700',
                      prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                    ].join(' ')}
                  >
                    {/* Linha superior: badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                        </span>
                        {prazoVencido && (
                          <span className="inline-flex items-center gap-1 rounded border border-red-500/60 bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                            PRAZO VENCIDO
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-550 font-bold">
                        {OCCURRENCE_STATUS_LABEL[oc.status] ?? oc.status}
                      </span>
                    </div>

                    {/* Descrição */}
                    <Link href={`/operador/ocorrencias/${oc.id}`} className="block group">
                      <p className="text-sm font-bold text-slate-200 group-hover:text-sky-400 transition-colors line-clamp-1">{oc.category || 'Incidente'}</p>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{oc.description}</p>
                    </Link>

                    {/* Rodapé */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-550 pt-2 border-t border-slate-950/40">
                      <span>{formatDatetime(oc.created_at)}</span>
                      <div className="flex items-center gap-2">
                        {hasPhoto && (
                          <Link
                            href={`/api/occurrences/${oc.id}/photo`}
                            target="_blank"
                            className="text-sky-500 hover:text-sky-400 font-bold"
                          >
                            Ver fotos ({oc.photos.length})
                          </Link>
                        )}
                        <span className={prazoVencido ? 'text-red-400 font-bold' : ''}>
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
                <Link href={`/operador/ocorrencias?page=${page - 1}${filter ? `&filter=${filter}` : ''}&view=list`} className="text-slate-400 hover:text-slate-200">
                  ← Anterior
                </Link>
              ) : <span />}
              <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link href={`/operador/ocorrencias?page=${page + 1}${filter ? `&filter=${filter}` : ''}&view=list`} className="text-slate-400 hover:text-slate-200">
                  Próxima →
                </Link>
              ) : <span />}
            </div>
          )}
        </>
      )}
    </main>
  )
}
