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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-xs text-slate-400 mt-1">{total} ocorrência(s) ativa(s) filtrada(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
            <Link href={`/gestor/ocorrencias?view=kanban${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'kanban' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Kanban">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/gestor/ocorrencias?view=table${statusFilter ? `&status=${statusFilter}` : ''}`}>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${view === 'table' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} title="Tabela">
                <Table className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <Link href="/gestor/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8 font-semibold">
              + Nova ocorrência
            </Button>
          </Link>

          <Link href={`/api/export?type=occurrences${showAll ? '&status=all' : ''}`} target="_blank">
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8">
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
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
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
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/40 border border-slate-850 p-5 rounded-xl">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* MTTR Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tempo de Resolução (MTTR)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-100">{mttrAverage}<span className="text-xs font-bold text-slate-500 ml-1">horas</span></p>
              <p className="text-[9px] text-slate-500 mt-1">Média desde o reporte até a conclusão da ocorrência.</p>
            </div>
          </div>

          {/* Resolution Rate Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450">
              <span className="text-[10px] font-bold uppercase tracking-wider">Taxa de Resolução</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-100">
                {totalOccurrences > 0 ? ((resolvedCount / totalOccurrences) * 100).toFixed(0) : '0'}%
              </p>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/80">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${totalOccurrences > 0 ? (resolvedCount / totalOccurrences) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5">{resolvedCount} resolvidas de {totalOccurrences} totais.</p>
            </div>
          </div>

          {/* Active / Critical Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendências Críticas</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-slate-100">{criticalCount}<span className="text-xs font-bold text-slate-500 ml-1">ativas</span></p>
              <p className="text-[9px] text-slate-500 mt-1">Ocorrências de severidade Alta ou Crítica pendentes.</p>
            </div>
          </div>
        </div>

        {/* Pie Chart Card */}
        <div className="rounded-xl border border-slate-850 bg-slate-950/20 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-450 pb-2 border-b border-slate-850">
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
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
              Nenhuma ocorrência encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Severidade</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Reportado por</th>
                    <th className="px-4 py-3">Prazo</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ocorrencias.map((oc) => {
                    const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
                    const hasPhoto     = oc.photos.length > 0

                    return (
                      <tr key={oc.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
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
                              <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                                📷 ({oc.photos.length})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <Link href={`/gestor/ocorrencias/${oc.id}`} className="text-slate-200 hover:text-sky-400 font-bold hover:underline line-clamp-1">
                            {oc.category || 'Incidente'}
                          </Link>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{oc.description}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{formatDatetime(oc.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{oc.reporter.name}</td>
                        <td className={`px-4 py-3 ${prazoVencido ? 'text-red-400 font-medium' : 'text-slate-450'}`}>
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
                  className="text-slate-400 hover:text-slate-200"
                >
                  ← Anterior
                </Link>
              ) : <span />}
              <span className="text-xs text-slate-650">Página {page} de {totalPages}</span>
              {page < totalPages ? (
                <Link
                  href={`/gestor/ocorrencias?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}&view=table`}
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
