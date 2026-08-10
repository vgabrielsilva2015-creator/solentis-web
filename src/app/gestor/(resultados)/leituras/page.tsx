import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Download, Camera } from 'lucide-react'
import { ResultsDataTable, UnifiedResult } from '@/components/gestor/resultados/results-data-table'
import { ResultsFilters } from '@/components/gestor/resultados/results-filters'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function GestorLeiturasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, q, status } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE
  const tenant_id = await getTenantId()

  const where: any = { tenant_id }

  if (q) {
    where.OR = [
      { collection_point: { name: { contains: q, mode: 'insensitive' } } },
      { parameter: { name: { contains: q, mode: 'insensitive' } } }
    ]
  }

  if (status === 'conforme') {
    where.is_non_conformant = false
  } else if (status === 'fora') {
    where.is_non_conformant = true
  }

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        recorder:         { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const data: UnifiedResult[] = readings.map(r => ({
    id: r.id,
    date: formatDatetime(r.recorded_at),
    pointName: r.collection_point.name,
    parameterName: r.parameter?.name || 'Observação Visual',
    valueDisplay: r.value !== null ? (
      <span className="font-mono text-foreground">
        {r.value} {r.unit}
      </span>
    ) : '—',
    originDisplay: (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
        CAMPO
      </span>
    ),
    recorderName: r.recorder?.name || 'Sistema',
    isNonConformant: r.is_non_conformant,
    evidenceNode: r.photo_filename ? (
      <>
        {' '}
        <a href={`/api/readings/${r.id}/photo`} target="_blank" rel="noopener" className="inline-flex items-center text-[10px] font-medium text-brand hover:underline mt-1 bg-brand/10 px-1.5 py-0.5 rounded-sm">
          <Camera className="w-3 h-3 mr-1" />
          Ver foto
        </a>
      </>
    ) : null
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Coletas de Campo</h1>
            <p className="text-sm text-muted-foreground">Histórico de registros manuais e IOT operacionais. ({total} registros)</p>
          </div>
          <Link href={`/api/export?type=readings`} target="_blank">
            <Button variant="outline" className="border-border bg-muted text-foreground hover:bg-secondary text-xs h-8">
              <Download className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </Link>
        </div>

        <ResultsFilters />

        <ResultsDataTable data={data} />

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm">
            {page > 1 ? (
              <Link
                href={`?page=${page - 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`}
                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground font-medium">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`?page=${page + 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`}
                className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
    </main>
  )
}
