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
  searchParams: Promise<{ dias?: string; paramId?: string; pontoId?: string }>
}) {
  const tenant_id = await getTenantId()
  const { dias: diasParam, paramId, pontoId } = await searchParams
  
  const diasValidos = [1, 7, 30] as const
  type Dias = typeof diasValidos[number]
  const diasNum = diasValidos.includes(Number(diasParam) as Dias) ? (Number(diasParam) as Dias) : 7

  // Busca nome do ponto se o filtro estiver ativo
  let activePointName = null
  if (pontoId) {
    const pt = await prisma.collectionPoint.findUnique({
      where: { id: pontoId, tenant_id },
      select: { name: true }
    })
    if (pt) activePointName = pt.name
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)
  const periodoAnteriorInicio = new Date(periodoInicio.getTime() - diasNum * 24 * 60 * 60 * 1000)
  
  // Limite de 24h para o Heatmap (mesmo que filtro global seja 7d)
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Filtro por ponto
  const pointCond = pontoId ? { collection_point_id: pontoId } : {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DADOS DOS KPIs (Paralelizados)
  // ─────────────────────────────────────────────────────────────────────────────
  const [
    // KPI 1: Registros (Leituras + Análises)
    readingsToday,
    readingsYesterday,
    analysesToday,
    analysesYesterday,
    externalToday,
    externalYesterday,

    // KPI 2: Ocorrências
    openOccurrences,
    // KPI 3: SLA
    slaAtRisk,

    // KPI 4: Conformidade
    totalReadsCurrent,
    nonConformReadsCurrent,
    totalReadsPrev,
    nonConformReadsPrev,
    totalAnalysesCurrent,
    nonConformAnalysesCurrent,
    totalAnalysesPrev,
    nonConformAnalysesPrev,
    totalExternalCurrent,
    nonConformExternalCurrent,
    totalExternalPrev,
    nonConformExternalPrev,
    
    // Sparklines 7 days
    readsLast7Days,
    analysesLast7Days,
    externalLast7Days,

    // Monitoring Schedules for Today
    schedules,
  ] = await Promise.all([
    // Hoje
    prisma.reading.count({ where: { tenant_id, created_at: { gte: today }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: yesterday, lt: today }, ...pointCond } }),
    prisma.analysis.count({ where: { tenant_id, collected_at: { gte: today }, ...pointCond } }),
    prisma.analysis.count({ where: { tenant_id, collected_at: { gte: yesterday, lt: today }, ...pointCond } }),
    prisma.externalAnalysis.count({ where: { tenant_id, collected_at: { gte: today }, ...pointCond } }),
    prisma.externalAnalysis.count({ where: { tenant_id, collected_at: { gte: yesterday, lt: today }, ...pointCond } }),
    
    prisma.occurrence.count({ where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...pointCond } }),
    
    prisma.occurrence.count({ 
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, deadline: { lt: new Date(now.getTime() + 2 * 60 * 60 * 1000) }, ...pointCond } 
    }),

    // Conformity Readings
    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),

    // Conformity Analyses
    prisma.analysis.count({ where: { tenant_id, collected_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.analysis.count({ where: { tenant_id, is_non_conformant: true, collected_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.analysis.count({ where: { tenant_id, collected_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    prisma.analysis.count({ where: { tenant_id, is_non_conformant: true, collected_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),

    // Conformity External
    prisma.externalAnalysis.count({ where: { tenant_id, collected_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.externalAnalysis.count({ where: { tenant_id, is_non_conformant: true, collected_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.externalAnalysis.count({ where: { tenant_id, collected_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    prisma.externalAnalysis.count({ where: { tenant_id, is_non_conformant: true, collected_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    
    // Sparkline
    prisma.reading.findMany({ where: { tenant_id, created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, ...pointCond }, select: { created_at: true } }),
    prisma.analysis.findMany({ where: { tenant_id, collected_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, ...pointCond }, select: { collected_at: true } }),
    prisma.externalAnalysis.findMany({ where: { tenant_id, collected_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, ...pointCond }, select: { collected_at: true } }),
    
    // Monitoring Schedule for Progress
    prisma.monitoringSchedule.findMany({ where: { tenant_id, is_active: true } })
  ])

  // Total Registers Top KPI
  const totalRegistersToday = readingsToday + analysesToday + externalToday
  const totalRegistersYesterday = readingsYesterday + analysesYesterday + externalYesterday
  const registersDelta = calcDelta(totalRegistersToday, totalRegistersYesterday)

  // Sparkline Aggregation
  const sparklineData = Array(7).fill(0)
  const allEvents = [
    ...readsLast7Days.map(r => r.created_at),
    ...analysesLast7Days.map(a => a.collected_at),
    ...externalLast7Days.map(e => e.collected_at)
  ]
  allEvents.forEach(date => {
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < 7) {
      sparklineData[6 - diffDays] += 1
    }
  })

  // Cálculos Conformidade
  const totalChecksCurrent = totalReadsCurrent + totalAnalysesCurrent + totalExternalCurrent
  const nonConformChecksCurrent = nonConformReadsCurrent + nonConformAnalysesCurrent + nonConformExternalCurrent
  const totalChecksPrev = totalReadsPrev + totalAnalysesPrev + totalExternalPrev
  const nonConformChecksPrev = nonConformReadsPrev + nonConformAnalysesPrev + nonConformExternalPrev

  const confCurrent = totalChecksCurrent > 0 ? ((totalChecksCurrent - nonConformChecksCurrent) / totalChecksCurrent) * 100 : null
  const confPrev = totalChecksPrev > 0 ? ((totalChecksPrev - nonConformChecksPrev) / totalChecksPrev) * 100 : null
  const confDelta = (confCurrent !== null && confPrev !== null) ? Math.round(confCurrent - confPrev) : null

  // Progresso Analítico (Total scheduled for today vs done)
  const dayOfWeek = today.getDay()
  const todaySchedules = schedules.filter(s => 
    s.days_of_week.length === 0 || s.days_of_week.includes(dayOfWeek)
  )

  const fieldSchedules = todaySchedules.filter(s => s.executor_role === 'OPERATOR').length
  const internalSchedules = todaySchedules.filter(s => s.executor_role === 'TECHNICIAN' && s.sample_type === 'INTERNAL').length
  const externalSchedules = todaySchedules.filter(s => s.executor_role === 'TECHNICIAN' && s.sample_type === 'EXTERNAL').length

  const dbProgress = {
    field: { done: readingsToday, scheduled: fieldSchedules },
    internal: { done: analysesToday, scheduled: internalSchedules },
    external: { done: externalToday, scheduled: externalSchedules },
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DADOS DO HEATMAP & OCORRÊNCIAS CRÍTICAS
  // ─────────────────────────────────────────────────────────────────────────────
  const [collectionPointsRaw, criticalOccurrences, occurrencesBySeverity] = await Promise.all([
    prisma.collectionPoint.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true,
        name: true,
        readings: { where: { created_at: { gte: last24h } }, select: { is_non_conformant: true } },
        analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
        external_analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
      },
    }),
    prisma.occurrence.findMany({
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...pointCond },
      orderBy: { deadline: 'asc' },
      take: 6,
      include: { reporter: { select: { name: true } } }
    }),
    // Ocorrencias por severidade (todas no periodo)
    prisma.occurrence.groupBy({
      by: ['severity'],
      where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond },
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
    const hasNonConform = cp.readings.some(r => r.is_non_conformant) || 
                          cp.analyses.some(a => a.is_non_conformant) || 
                          cp.external_analyses.some(e => e.is_non_conformant)
    
    const hasAnyReadings = cp.readings.length > 0 || cp.analyses.length > 0 || cp.external_analyses.length > 0
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
  let trendData: any[] = []
  
  if (selectedParam) {
    const [reads, analyses, externals] = await Promise.all([
      prisma.reading.findMany({
        where: { tenant_id, parameter_id: selectedParam.id, created_at: { gte: last24h }, ...pointCond },
        select: { value: true, created_at: true }
      }),
      prisma.analysis.findMany({
        where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: last24h }, ...pointCond },
        select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true, laboratory_type: true }
      }),
      prisma.externalAnalysis.findMany({
        where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: last24h }, ...pointCond },
        select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true }
      })
    ])
    
    trendData = [
      ...reads.map(a => ({
        time: a.created_at, timeStr: formatDateDisplay(a.created_at), value: a.value, minLimit: null, maxLimit: null, laboratoryType: 'FIELD'
      })),
      ...analyses.map(a => ({
        time: a.collected_at, timeStr: formatDateDisplay(a.collected_at), value: a.value, minLimit: a.min_limit_applied, maxLimit: a.max_limit_applied, laboratoryType: a.laboratory_type
      })),
      ...externals.map(a => ({
        time: a.collected_at, timeStr: formatDateDisplay(a.collected_at), value: a.value, minLimit: a.min_limit_applied, maxLimit: a.max_limit_applied, laboratoryType: 'EXTERNAL'
      }))
    ]
    
    // Ordena pelo tempo
    trendData.sort((a, b) => a.time.getTime() - b.time.getTime())
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. WIDGETS (FEED, MAINTENANCE, SLA)
  // ─────────────────────────────────────────────────────────────────────────────
  const [auditFeed, pendingMaintenances, resolvedOccurrences] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    }),
    prisma.preventiveMaintenance.findMany({
      where: { tenant_id, status: 'SCHEDULED' },
      orderBy: { scheduled_date: 'asc' },
      take: 4,
      include: { equipment: { select: { name: true } } }
    }),
    prisma.occurrence.findMany({
      where: { tenant_id, status: 'RESOLVED', resolved_at: { not: null } },
      select: { severity: true, created_at: true, resolved_at: true }
    })
  ])

  const dbFeed = auditFeed.map(log => {
    let text = 'registrou uma atividade.'
    let type = 'ok'
    if (log.table_name === 'readings') { text = 'registrou uma leitura de campo.'; type = 'reading' }
    if (log.table_name === 'analyses') { text = 'registrou análise interna.'; type = 'reading' }
    if (log.table_name === 'external_analyses') { text = 'importou laudo externo.'; type = 'reading' }
    if (log.table_name === 'occurrences') { text = 'abriu/atualizou uma ocorrência.'; type = 'alert' }
    if (log.table_name === 'chemical_stock_exits') { text = 'lançou consumo de químicos.'; type = 'chem' }
    if (log.table_name === 'shift_instances') { text = 'atualizou status de um turno.'; type = 'shift' }

    return {
      time: formatDateDisplay(log.timestamp),
      who: log.user ? log.user.name : 'Sistema',
      text,
      type
    }
  })

  const dbMaintenance = pendingMaintenances.map(m => {
    const diffTime = m.scheduled_date.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return { name: m.equipment.name, days: days < 0 ? 0 : days }
  })

  const slaTargets: Record<string, number> = { CRITICAL: 24, HIGH: 72, MEDIUM: 168, LOW: 720 }
  
  const slaMap = new Map<string, { totalHours: number, count: number }>()
  resolvedOccurrences.forEach(o => {
    if (o.resolved_at) {
      const hours = (o.resolved_at.getTime() - o.created_at.getTime()) / (1000 * 60 * 60)
      const data = slaMap.get(o.severity) || { totalHours: 0, count: 0 }
      data.totalHours += hours
      data.count += 1
      slaMap.set(o.severity, data)
    }
  })

  const dbSla = Object.keys(slaTargets).map(severity => {
    const meta = slaTargets[severity]
    const data = slaMap.get(severity)
    const avg = data && data.count > 0 ? Math.round(data.totalHours / data.count) : 0
    return { sev: severityLabels[severity] || severity, avg, meta }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CÁLCULO DE EFICIÊNCIA (DQO / DBO)
  // ─────────────────────────────────────────────────────────────────────────────
  let dbEfficiency = null
  const dqoParam = parameters.find(p => p.name.toLowerCase().includes('dqo') || p.name.toLowerCase().includes('demanda química'))
  if (dqoParam) {
    // Busca média de entrada e saída
    const inPoint = collectionPointsRaw.find(p => p.name.toLowerCase().includes('entrada') || p.name.toLowerCase().includes('bruto'))
    const outPoint = collectionPointsRaw.find(p => p.name.toLowerCase().includes('saída') || p.name.toLowerCase().includes('tratado') || p.name.toLowerCase().includes('final'))
    
    if (inPoint && outPoint) {
      const [inAnalyses, outAnalyses, inExt, outExt] = await Promise.all([
        prisma.analysis.findMany({ where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: inPoint.id, collected_at: { gte: periodoInicio } }, select: { value: true } }),
        prisma.analysis.findMany({ where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: outPoint.id, collected_at: { gte: periodoInicio } }, select: { value: true } }),
        prisma.externalAnalysis.findMany({ where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: inPoint.id, collected_at: { gte: periodoInicio } }, select: { value: true } }),
        prisma.externalAnalysis.findMany({ where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: outPoint.id, collected_at: { gte: periodoInicio } }, select: { value: true } })
      ])
      
      const inValid = [...inAnalyses, ...inExt].filter(a => a.value !== null)
      const outValid = [...outAnalyses, ...outExt].filter(a => a.value !== null)
      
      const inAvg = inValid.length > 0 ? inValid.reduce((s, a) => s + (a.value || 0), 0) / inValid.length : 0
      const outAvg = outValid.length > 0 ? outValid.reduce((s, a) => s + (a.value || 0), 0) / outValid.length : 0
      
      if (inAvg > 0) {
        const val = Math.max(0, Math.round(((inAvg - outAvg) / inAvg) * 100))
        dbEfficiency = { in: Math.round(inAvg), out: Math.round(outAvg), val }
      }
    }
  }

  return (
    <DashboardClient 
      dbTotalRegistersToday={totalRegistersToday}
      dbRegistersDelta={registersDelta}
      dbProgress={dbProgress}
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
      dbFeed={dbFeed}
      dbMaintenance={dbMaintenance}
      dbSla={dbSla}
      dbParameters={parameters}
      dbSelectedParam={selectedParam}
      diasNum={diasNum}
      paramId={paramId}
      pontoId={pontoId}
      activePointName={activePointName}
      dbEfficiency={dbEfficiency}
    />
  )
}
