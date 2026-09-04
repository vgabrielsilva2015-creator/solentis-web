import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { ResultsDataTable, UnifiedResult } from '@/components/gestor/resultados/results-data-table'
import { ResultsFilters } from '@/components/gestor/resultados/results-filters'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function GestorLaudosPage({
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

  const where: any = { 
    tenant_id,
    laboratory_type: 'EXTERNAL'
  }

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

  const [analises, total] = await Promise.all([
    prisma.analysis.findMany({
      where,
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true, unit: true } },
        recorder:         { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.analysis.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const data: UnifiedResult[] = analises.map(a => ({
    id: a.id,
    date: formatDatetime(a.collected_at),
    pointName: a.collection_point.name,
    parameterName: a.parameter.name,
    valueDisplay: a.value !== null ? (
      <span className="font-mono text-foreground">
        {a.value} {a.parameter.unit}
      </span>
    ) : '—',
    originDisplay: (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
        EXTERNA
      </span>
    ),
    recorderName: 'Laboratório Terceiro',
    isNonConformant: a.is_non_conformant,
    evidenceNode: a.report_text ? (
      <>
        {' '}
        <a href={a.report_text} target="_blank" rel="noopener" className="inline-flex items-center text-[10px] font-medium text-brand hover:underline mt-1 bg-brand/10 px-1.5 py-0.5 rounded-sm">
          Ver PDF
        </a>
      </>
    ) : null
  }))

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Laudos Externos</h1>
            <p className="text-sm text-muted-foreground">Histórico unificado de análises realizadas por laboratórios terceiros. ({total} registros)</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/gestor/laudos/importar`}>
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white text-xs h-8">
                Importar Laudo PDF
              </Button>
            </Link>
            <Link href={`/api/export?type=external_analyses`} target="_blank">
              <Button variant="outline" className="border-border bg-muted text-foreground hover:bg-secondary text-xs h-8">
                <Download className="w-4 h-4 mr-1.5" />
                Exportar CSV
              </Button>
            </Link>
          </div>
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
