import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { Download, LayoutGrid, Table, Clock, ShieldAlert, CheckCircle2, BarChart2 } from 'lucide-react'
import { OccurrencesKanban } from '@/components/occurrences-kanban'
import { OccurrencesPieChart } from '@/components/ui/occurrences-pie-chart'

import { SEVERITY_LABEL, SEVERITY_COLOR, OCCURRENCE_STATUS_LABEL, OCCURRENCE_STATUS_COLOR } from '@/lib/labels'

const PAGE_SIZE  = 25

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasGestorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; view?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedParams = await searchParams
  const pageParam = resolvedParams.page
  const statusFilter = resolvedParams.status
  const view = resolvedParams.view || 'kanban'

  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const tenantId = await getTenantId()

  const where = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } }),
  }

  // Fetch paginated or raw data
  const [ocorrencias, total, allStats] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true } },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take: view === 'table' ? PAGE_SIZE : 100,
      skip: view === 'table' ? skip : undefined,
    }),
    prisma.occurrence.count({ where }),
    prisma.occurrence.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      select: {
        status: true,
        severity: true,
        type: true,
        created_at: true,
        resolved_at: true
      }
    })
  ])

  // Compute Metrics
  const totalOccurrences = allStats.length
  const openCount = allStats.filter(o => o.status !== 'RESOLVED').length
  const resolvedCount = allStats.filter(o => o.status === 'RESOLVED').length
  const criticalCount = allStats.filter(o => o.status !== 'RESOLVED' && (o.severity === 'CRITICAL' || o.severity === 'HIGH')).length
  
  const resolvedItems = allStats.filter(o => o.status === 'RESOLVED' && o.resolved_at)
  const mttrTotalHours = resolvedItems.reduce((acc, curr) => {
    const diff = curr.resolved_at!.getTime() - curr.created_at.getTime()
    return acc + (diff / (1000 * 60 * 60))
  }, 0)
  const mttrAverage = resolvedItems.length > 0 ? (mttrTotalHours / resolvedItems.length).toFixed(1) : '0'

  // Type Distribution
  const typeCounts = {
    OPERATIONAL: 0,
    LABORATORY: 0,
    EQUIPMENT: 0,
    ENVIRONMENTAL: 0,
    SAFETY: 0,
    OTHER: 0
  }

  allStats.forEach(o => {
    const t = o.type as keyof typeof typeCounts
    if (t && typeCounts[t] !== undefined) {
      typeCounts[t]++
    } else {
      typeCounts.OTHER++
    }
  })

  const pieChartData = [
    { name: 'Operacional', value: typeCounts.OPERATIONAL, color: '#10b981' },
    { name: 'Laboratorial', value: typeCounts.LABORATORY, color: '#0ea5e9' },
    { name: 'Equipamento', value: typeCounts.EQUIPMENT, color: '#f59e0b' },
    { name: 'Ambiental', value: typeCounts.ENVIRONMENTAL, color: '#6366f1' },
    { name: 'Segurança', value: typeCounts.SAFETY, color: '#f43f5e' },
    { name: 'Outros', value: typeCounts.OTHER, color: '#64748b' }
  ].filter(item => item.value > 0)

  const now = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-xs text-muted-foreground mt-1">{total} ocorrência(s) ativa(s) filtrada(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 mr-2">
            <Link href={`/gestor/ocorrencias?view=kanban${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'kanban' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Kanban">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/gestor/ocorrencias?view=table${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Tabela">
                <Table className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Link href="/gestor/ocorrencias/nova">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 font-semibold">
              + Nova ocorrência
            </Button>
          </Link>

          <Link href={`/api/export?type=occurrences${showAll ? '&status=all' : ''}`} target="_blank">
            <Button variant="outline" className="border-border bg-muted text-foreground hover:bg-secondary text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar CSV
            </Button>
          </Link>

          <Link
            href={`/gestor/ocorrencias?view=${view}`}
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center font-medium h-8',
              !showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-border bg-muted text-muted-foreground hover:bg-secondary',
            ].join(' ')}
          >
            Em aberto
          </Link>
          <Link
            href={`/gestor/ocorrencias?status=all&view=${view}`}
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center font-medium h-8',
              showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-border bg-muted text-muted-foreground hover:bg-secondary',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-card/40 border border-border p-5 rounded-xl">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* MTTR Card */}
          <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tempo de Resolução (MTTR)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-foreground">{mttrAverage}<span className="text-xs font-bold text-muted-foreground ml-1">horas</span></p>
              <p className="text-[9px] text-muted-foreground mt-1">Média desde o reporte até a conclusão da ocorrência.</p>
            </div>
          </div>

          {/* Resolution Rate Card */}
          <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Taxa de Resolução</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-foreground">
                {totalOccurrences > 0 ? ((resolvedCount / totalOccurrences) * 100).toFixed(0) : '0'}%
              </p>
              <div className="w-full bg-card h-1.5 rounded-full mt-2 overflow-hidden border border-border/80">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${totalOccurrences > 0 ? (resolvedCount / totalOccurrences) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5">{resolvedCount} resolvidas de {totalOccurrences} totais.</p>
            </div>
          </div>

          {/* Active / Critical Card */}
          <div className="rounded-xl border border-border bg-background/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendências Críticas</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-foreground">{criticalCount}<span className="text-xs font-bold text-muted-foreground ml-1">ativas</span></p>
              <p className="text-[9px] text-muted-foreground mt-1">Ocorrências de severidade Alta ou Crítica pendentes.</p>
            </div>
          </div>
        </div>

        {/* Pie Chart Card */}
        <div className="rounded-xl border border-border bg-background/20 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider">Distribuição por Tipo</span>
            <BarChart2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            <OccurrencesPieChart data={pieChartData} />
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <OccurrencesKanban initialOccurrences={ocorrencias} baseUrl="/gestor/ocorrencias" />
      )}

      {/* Table View */}
      {view === 'table' && (
        <>
          {ocorrencias.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card/20">
              <table className="w-full text-sm">
                <thead className="bg-card text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Severidade</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Reportado por</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ocorrencias.map((oc) => {
                    const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
                    const hasPhoto     = oc.photos.length > 0

                    return (
                      <tr key={oc.id} className="bg-card/50 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? ''}`}>
                              {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                            </span>
                            {prazoVencido && (
                              <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                                VENCIDO
                              </span>
                            )}
                            {hasPhoto && (
                              <span className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                📷 ({oc.photos.length})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <Link href={`/gestor/ocorrencias/${oc.id}`} className="text-foreground hover:text-sky-400 font-bold hover:underline line-clamp-1">
                            {oc.category || 'Incidente'}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{oc.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDatetime(oc.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{oc.reporter.name}</td>
                        <td className={`px-4 py-3 ${prazoVencido ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                          {formatDatetime(oc.deadline)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${OCCURRENCE_STATUS_COLOR[oc.status] ?? ''}`}>
                            {OCCURRENCE_STATUS_LABEL[oc.status] ?? oc.status}
                          </span>
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
                  href={`/gestor/ocorrencias?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}&view=table`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Anterior
                </Link>
              ) : <span />}
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link
                  href={`/gestor/ocorrencias?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}&view=table`}
                  className="text-muted-foreground hover:text-foreground"
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
