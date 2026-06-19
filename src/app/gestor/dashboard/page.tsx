import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { KpiCard } from '@/components/ui/kpi-card'
import { StatusHeatmap, HeatmapPoint, PointStatus } from '@/components/ui/status-heatmap'
import { TrendChart, TrendChartData } from '@/components/ui/trend-chart'
import { ParamSelector } from "./param-selector"

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null // Sem histórico para comparar
  return Math.round(((current - previous) / previous) * 100)
}

function formatDateDisplay(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function GestorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; paramId?: string }>
}) {
  const tenant_id = await getTenantId()
  const { dias: diasParam, paramId } = await searchParams
  
  const diasValidos = [1, 7, 30] as const
  type Dias = typeof diasValidos[number]
  const diasNum = diasValidos.includes(Number(diasParam) as Dias) ? (Number(diasParam) as Dias) : 7

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)
  const periodoAnteriorInicio = new Date(periodoInicio.getTime() - diasNum * 24 * 60 * 60 * 1000)
  
  // Limite de 24h para o Heatmap (mesmo que filtro global seja 7d)
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DADOS DOS KPIs (Paralelizados)
  // ─────────────────────────────────────────────────────────────────────────────
  const [
    // KPI 1: Leituras
    readingsToday,
    readingsYesterday,
    // KPI 2: Ocorrências
    openOccurrences,
    // KPI 3: SLA
    slaAtRisk,
    // KPI 4: Conformidade
    totalChecksCurrent,
    nonConformChecksCurrent,
    totalChecksPrev,
    nonConformChecksPrev,
    
    // Sparkline de Leituras (últimos 7 dias - agregação feita no JS por conta de restrições do SQLite)
    readingsLast7Days,
  ] = await Promise.all([
    prisma.reading.count({ where: { tenant_id, created_at: { gte: today } } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: yesterday, lt: today } } }),
    
    prisma.occurrence.count({ where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    
    prisma.occurrence.count({ 
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, deadline: { lt: new Date(now.getTime() + 2 * 60 * 60 * 1000) } } 
    }),

    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoInicio } } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoInicio } } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio } } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio } } }),
    
    prisma.reading.findMany({
      where: { tenant_id, created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      select: { created_at: true }
    }),
  ])

  // Sparkline Aggregation
  const sparklineData = Array(7).fill(0)
  readingsLast7Days.forEach(r => {
    const diffTime = Math.abs(now.getTime() - r.created_at.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < 7) {
      sparklineData[6 - diffDays] += 1
    }
  })

  // Cálculos Conformidade
  const confCurrent = totalChecksCurrent > 0 ? ((totalChecksCurrent - nonConformChecksCurrent) / totalChecksCurrent) * 100 : null
  const confPrev = totalChecksPrev > 0 ? ((totalChecksPrev - nonConformChecksPrev) / totalChecksPrev) * 100 : null
  const confDelta = (confCurrent !== null && confPrev !== null) ? Math.round(confCurrent - confPrev) : null

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DADOS DO HEATMAP & OCORRÊNCIAS CRÍTICAS
  // ─────────────────────────────────────────────────────────────────────────────
  const [collectionPointsRaw, criticalOccurrences] = await Promise.all([
    prisma.collectionPoint.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true,
        name: true,
        readings: {
          where: { created_at: { gte: last24h } },
          select: { is_non_conformant: true },
        },
      },
    }),
    prisma.occurrence.findMany({
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { deadline: 'asc' },
      take: 6,
      include: { reporter: { select: { name: true } } }
    }),
  ])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CONSUMO QUÍMICO
  // ─────────────────────────────────────────────────────────────────────────────
  const chemicalExitsRaw = await prisma.chemicalStockExit.findMany({
    where: { tenant_id, used_at: { gte: periodoInicio } },
    include: { product: { select: { name: true, unit: true } } }
  })
  
  const chemicalConsumptionMap = new Map<string, { name: string, unit: string, total: number }>()
  chemicalExitsRaw.forEach(exit => {
    const key = exit.product_id
    if (!chemicalConsumptionMap.has(key)) {
      chemicalConsumptionMap.set(key, { name: exit.product.name, unit: exit.product.unit, total: 0 })
    }
    chemicalConsumptionMap.get(key)!.total += exit.quantity
  })
  const chemicalConsumptionData = Array.from(chemicalConsumptionMap.values()).sort((a, b) => b.total - a.total)

  const heatmapPoints: HeatmapPoint[] = collectionPointsRaw.map(cp => {
    const hasNonConform = cp.readings.some(r => r.is_non_conformant)
    const hasAnyReadings = cp.readings.length > 0
    let status: PointStatus = 'OK'
    if (hasNonConform) status = 'DANGER'
    else if (!hasAnyReadings) status = 'WARNING' // Atenção se não mediu nas últimas 24h
    return { id: cp.id, name: cp.name, status }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DADOS DO GRÁFICO DE TENDÊNCIAS
  // ─────────────────────────────────────────────────────────────────────────────
  const parameters = await prisma.qualityParameter.findMany({
    where: { tenant_id, is_active: true },
    select: { id: true, name: true, unit: true },
  })
  
  const selectedParam = parameters.find(p => p.id === paramId) || parameters[0]
  let trendData: TrendChartData[] = []
  
  if (selectedParam) {
    const analysesForChart = await prisma.analysis.findMany({
      where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: last24h } },
      orderBy: { collected_at: 'asc' },
      select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true, laboratory_type: true }
    })
    
    trendData = analysesForChart.map(a => ({
      time: formatDateDisplay(a.collected_at),
      value: a.value,
      minLimit: a.min_limit_applied,
      maxLimit: a.max_limit_applied,
      laboratoryType: a.laboratory_type
    }))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERIZAÇÃO DA PÁGINA
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER & FILTROS GLOBAIS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Visão Geral</h1>
          <p className="text-sm text-slate-400">Status operacional e alertas em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          {[1, 7, 30].map(d => (
            <Link
              key={d}
              href={`/gestor/dashboard?dias=${d}${paramId ? `&paramId=${paramId}` : ''}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                diasNum === d 
                  ? 'bg-slate-700 text-slate-100 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {d === 1 ? '24h' : `${d}d`}
            </Link>
          ))}
        </div>
      </div>

      {/* LINHA 1: KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Leituras Hoje"
          value={readingsToday}
          delta={calcDelta(readingsToday, readingsYesterday)}
          deltaLabel="vs ontem"
          href="/gestor/leituras"
          sparklineData={sparklineData}
        />
        <KpiCard 
          title="Ocorrências Abertas"
          value={openOccurrences}
          href="/gestor/ocorrencias"
          alert={openOccurrences > 0}
        />
        <KpiCard 
          title="SLA em Risco (< 2h)"
          value={slaAtRisk}
          href="/gestor/ocorrencias"
          alert={slaAtRisk > 0}
        />
        <KpiCard 
          title="Conformidade CONAMA"
          value={confCurrent !== null ? `${confCurrent.toFixed(1)}%` : '—'}
          delta={confDelta}
          deltaLabel={`vs ${diasNum}d anteriores`}
        />
      </section>

      {/* LINHA 2: HEATMAP E OCORRÊNCIAS CRÍTICAS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Status dos Pontos de Coleta (24h)</h2>
          <StatusHeatmap points={heatmapPoints} />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ocorrências Críticas</h2>
          <div className="flex flex-col gap-2">
            {criticalOccurrences.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                Nenhuma ocorrência crítica aberta.
              </div>
            ) : (
              criticalOccurrences.map(occ => {
                const isOverdue = occ.deadline < now
                const color = occ.severity === 'CRITICAL' ? 'border-status-critical/50' : 'border-status-danger/50'
                const badgeBg = occ.severity === 'CRITICAL' ? 'bg-status-critical/20 text-status-critical' : 'bg-status-danger/20 text-status-danger'
                
                return (
                  <Link 
                    key={occ.id} 
                    href={`/gestor/ocorrencias`}
                    className={`flex flex-col gap-1 p-3 rounded-lg border bg-slate-900/50 hover:bg-slate-800 transition-colors ${color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200 truncate pr-2">{occ.description}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                        {occ.severity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-500">{occ.reporter?.name || 'Sistema'}</span>
                      <span className={`text-[10px] font-mono ${isOverdue ? 'text-status-critical font-bold' : 'text-slate-400'}`}>
                        ⏱ {isOverdue ? 'VENCIDO' : formatDateDisplay(occ.deadline)}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* LINHA 3: TENDÊNCIA DE PARÂMETROS */}
      {parameters.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tendência por Parâmetro (24h)</h2>
            <ParamSelector 
              parameters={parameters} 
              defaultValue={selectedParam?.id} 
              diasNum={diasNum} 
            />
          </div>
          
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <TrendChart 
              data={trendData} 
              parameterName={selectedParam?.name || ''} 
              unit={selectedParam?.unit || ''} 
            />
          </div>
        </section>
      )}

      {/* LINHA 4: CONSUMO QUÍMICO */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Consumo de Produtos Químicos ({diasNum === 1 ? 'Últimas 24h' : `Últimos ${diasNum} dias`})
        </h2>
        {chemicalConsumptionData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            Nenhum registro de consumo no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {chemicalConsumptionData.map(item => (
              <div key={item.name} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                <p className="text-sm text-slate-400 mb-2 truncate" title={item.name}>{item.name}</p>
                <p className="text-2xl font-semibold text-slate-100">
                  {item.total.toFixed(2)} <span className="text-sm text-slate-500 font-normal">{item.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}
