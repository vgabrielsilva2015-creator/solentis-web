import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { DashboardClient } from './dashboard-client'

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
  const [collectionPointsRaw, criticalOccurrences, occurrencesBySeverity] = await Promise.all([
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
    // Ocorrencias por severidade (todas no periodo)
    prisma.occurrence.groupBy({
      by: ['severity'],
      where: { tenant_id, created_at: { gte: periodoInicio } },
      _count: { severity: true }
    })
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

  const heatmapPoints = collectionPointsRaw.map(cp => {
    const hasNonConform = cp.readings.some(r => r.is_non_conformant)
    const hasAnyReadings = cp.readings.length > 0
    let status: 'OK' | 'WARNING' | 'DANGER' = 'OK'
    if (hasNonConform) status = 'DANGER'
    else if (!hasAnyReadings) status = 'WARNING' // Atenção se não mediu nas últimas 24h
    return { id: cp.id, name: cp.name, status }
  })

  // Cores por severidade
  const severityColors: Record<string, string> = {
    LOW: '#64748b',       // slate-500
    MEDIUM: '#f59e0b',    // amber-500
    HIGH: '#f97316',      // orange-500
    CRITICAL: '#ef4444'   // red-500
  }
  const severityLabels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica'
  }
  
  const occurrencesPieData = occurrencesBySeverity.map(o => ({
    name: severityLabels[o.severity] || o.severity,
    value: o._count.severity,
    color: severityColors[o.severity] || '#94a3b8'
  }))

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DADOS DO GRÁFICO DE TENDÊNCIAS
  // ─────────────────────────────────────────────────────────────────────────────
  const parameters = await prisma.qualityParameter.findMany({
    where: { tenant_id, is_active: true },
    select: { id: true, name: true, unit: true },
  })
  
  const selectedParam = parameters.find(p => p.id === paramId) || parameters[0]
  let trendData = []
  
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

  return (
    <DashboardClient 
      dbReadingsToday={readingsToday}
      dbOpenOccurrences={openOccurrences}
      dbSlaAtRisk={slaAtRisk}
      dbConfCurrent={confCurrent}
      dbConfDelta={confDelta}
      dbSparklineData={sparklineData}
      dbHeatmapPoints={heatmapPoints}
      dbCriticalOccurrences={criticalOccurrences}
      dbOccurrencesPieData={occurrencesPieData}
      dbChemicalConsumptionData={chemicalConsumptionData}
      dbTrendData={trendData}
      dbParameters={parameters}
      dbSelectedParam={selectedParam}
      diasNum={diasNum}
      paramId={paramId}
    />
  )
}
