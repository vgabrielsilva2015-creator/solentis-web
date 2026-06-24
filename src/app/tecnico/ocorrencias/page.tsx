import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { OccurrencesKanban } from '@/components/occurrences-kanban'
import { LayoutGrid, Table } from 'lucide-react'

const PAGE_SIZE  = 20

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasTecnicoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; view?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedParams = await searchParams
  const pageParam = resolvedParams.page
  const statusFilter = resolvedParams.status
  const view = resolvedParams.view || 'list'

  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    deleted_at: null,
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } }),
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true } },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take: view === 'list' ? PAGE_SIZE : 100,
      skip: view === 'list' ? skip : undefined,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-semibold">Ocorrências</h1>
          <p className="text-xs text-slate-400">{total} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
            <Link href={`/tecnico/ocorrencias?view=kanban${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'kanban' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Kanban">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/tecnico/ocorrencias?view=list${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'list' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Lista">
                <Table className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Link
            href="/tecnico/ocorrencias/nova"
            className="rounded-md border border-green-700 bg-green-900/40 px-3 py-1.5 text-xs text-green-400 hover:bg-green-900/60 font-semibold flex items-center h-8"
          >
            + Nova
          </Link>
          <Link
            href={`/tecnico/ocorrencias?view=${view}`}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-semibold h-8 flex items-center',
              !showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Em aberto
          </Link>
          <Link
            href={`/tecnico/ocorrencias?status=all&view=${view}`}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-semibold h-8 flex items-center',
              showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <OccurrencesKanban initialOccurrences={ocorrencias} baseUrl="/tecnico/ocorrencias" />
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
          {ocorrencias.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
              Nenhuma ocorrência encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {ocorrencias.map((oc) => {
                const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
                const hasPhoto     = oc.photos.length > 0

                return (
                  <Link
                    key={oc.id}
                    href={`/tecnico/ocorrencias/${oc.id}`}
                    className={[
                      'block rounded-xl border bg-slate-900 p-4 space-y-2 hover:bg-slate-800 transition-colors',
                      prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                    ].join(' ')}
                  >
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                      </span>
                      {prazoVencido && (
                        <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                          PRAZO VENCIDO
                        </span>
                      )}
                      {oc.status === 'RESOLVED' && (
                        <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                          Resolvida
                        </span>
                      )}
                      {hasPhoto && (
                        <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                          Com foto ({oc.photos.length})
                        </span>
                      )}
                    </div>

                    {/* Descrição */}
                    <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                    {/* Rodapé */}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{oc.reporter.name} · {formatDatetime(oc.created_at)}</span>
                      <span className={prazoVencido ? 'text-red-400 font-medium' : ''}>
                        {formatDatetime(oc.deadline)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              {page > 1 ? (
                <Link
                  href={`/tecnico/ocorrencias?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}&view=list`}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ← Anterior
                </Link>
              ) : <span />}
              <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link
                  href={`/tecnico/ocorrencias?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}&view=list`}
                  className="text-slate-400 hover:text-slate-200"
                >
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
