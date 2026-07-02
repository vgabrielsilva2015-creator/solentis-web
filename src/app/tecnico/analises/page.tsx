import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ApproveButton } from './approve-button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where:   { tenant_id: (await getTenantId()) },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        method:           { select: { name: true } },
        approver:         { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.analysis.count({ where: { tenant_id: (await getTenantId()) } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canApprove = session.user.role === 'TECHNICIAN' || session.user.role === 'MANAGER'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Análises</h1>
            <p className="text-xs text-muted-foreground">{total} registro(s) no total</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tecnico/analises/historico">
              <Button variant="outline" className="border-border text-foreground hover:bg-muted text-xs h-8">
                Histórico
              </Button>
            </Link>
            {session.user.role === 'MANAGER' && (
              <Link href="/gestor/parametros">
                <Button variant="outline" className="border-border text-foreground hover:bg-muted text-xs h-8">
                  Config. Analíticas
                </Button>
              </Link>
            )}
            {session.user.role === 'TECHNICIAN' && (
              <Link href="/tecnico/analises/nova">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8">
                  + Nova
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lista */}
        {analyses.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">
            Nenhuma análise registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div
                key={a.id}
                className={[
                  'rounded-xl border bg-card p-4 space-y-2',
                  a.is_non_conformant
                    ? 'border-red-900/60'
                    : 'border-border',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {a.collection_point.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDatetime(a.collected_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {a.is_non_conformant && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                        Fora do limite
                      </span>
                    )}
                    {a.approved_by ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Aprovado
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Parâmetro + valor */}
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.parameter.name}:</span>{' '}
                  {a.value} {a.unit}
                  <span className="text-muted-foreground"> · {a.method?.name ?? 'N/A'}</span>
                </p>

                {/* Limites aplicados (snapshot) */}
                {(a.min_limit_applied !== null || a.max_limit_applied !== null) && (
                  <p className="text-xs text-muted-foreground">
                    Limite vigente na coleta: {a.min_limit_applied ?? '—'} – {a.max_limit_applied ?? '—'} {a.unit}
                  </p>
                )}

                {/* Aprovador ou botão de aprovação */}
                <div className="flex items-center justify-between pt-0.5">
                  {a.approved_by ? (
                    <p className="text-xs text-muted-foreground">
                      Aprovado por {a.approver?.name ?? '—'}
                    </p>
                  ) : (
                    <span />
                  )}
                  {!a.approved_by && canApprove && (
                    <ApproveButton analysisId={a.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/tecnico/analises?page=${page - 1}`} className="text-muted-foreground hover:text-foreground">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/tecnico/analises?page=${page + 1}`} className="text-muted-foreground hover:text-foreground">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}
