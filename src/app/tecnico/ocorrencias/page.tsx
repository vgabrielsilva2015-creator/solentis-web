import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID = 'default'
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
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = statusFilter === 'all'

  const where = {
    tenant_id: TENANT_ID,
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/tecnico/ocorrencias"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                !showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Em aberto
            </Link>
            <Link
              href="/tecnico/ocorrencias?status=all"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Todas
            </Link>
          </div>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
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
                        Com foto
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
                href={`/tecnico/ocorrencias?page=${page - 1}${showAll ? '&status=all' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/ocorrencias?page=${page + 1}${showAll ? '&status=all' : ''}`}
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
