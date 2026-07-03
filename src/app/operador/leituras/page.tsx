import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function LeituraListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, filter } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: any = { tenant_id: (await getTenantId()) }
  if (filter === 'non-conformant') {
    where.is_non_conformant = true
  } else if (filter === 'conformant') {
    where.is_non_conformant = false
  }

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho da listagem */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Leituras</h1>
            <p className="text-xs text-muted-foreground">{total} registro(s) no total</p>
          </div>
          <Link href="/operador/leituras/nova">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href="/operador/leituras" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${!filter ? 'bg-brand/20 text-brand border-brand/30' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            Todas
          </Link>
          <Link href="/operador/leituras?filter=conformant" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'conformant' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            Conforme
          </Link>
          <Link href="/operador/leituras?filter=non-conformant" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'non-conformant' ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            Não Conforme
          </Link>
        </div>

        {/* Lista de leituras */}
        {readings.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">
            Nenhuma leitura registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map((r) => (
              <div
                key={r.id}
                className={[
                  'rounded-xl border bg-card p-4 space-y-1.5',
                  r.is_non_conformant === true
                    ? 'border-red-900/60'
                    : 'border-border',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {r.collection_point.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDatetime(r.recorded_at)}</p>
                  </div>
                  {r.is_non_conformant === true && (
                    <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                      Fora do limite
                    </span>
                  )}
                </div>

                {/* Valor do parâmetro ou indicação de observação visual */}
                {r.parameter ? (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{r.parameter.name}:</span>{' '}
                    {r.value !== null
                      ? `${r.value}${r.unit ? ` ${r.unit}` : ''}`
                      : '—'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Observação visual</p>
                )}

                {/* Observação livre (truncada) */}
                {r.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/operador/leituras?page=${page - 1}`}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/operador/leituras?page=${page + 1}`}
                className="text-muted-foreground hover:text-foreground"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

        {/* Link de volta ao dashboard */}
        <div className="pt-2">
          <Link href="/operador/dashboard" className="text-xs text-muted-foreground hover:text-muted-foreground">
            ← Voltar ao painel
          </Link>
        </div>
    </main>
  )
}
