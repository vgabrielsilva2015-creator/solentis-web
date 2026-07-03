import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getTenantId } from '@/lib/tenant'
import { APP_TIMEZONE } from '@/lib/date-utils'
import { DashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

// COUNT retorna bigint no $queryRaw — normaliza para number
const num = (v: unknown): number => Number(v as bigint)

type MeasCountRow = {
  today: bigint; yesterday: bigint
  total_current: bigint; nc_current: bigint
  total_prev: bigint; nc_prev: bigint
  today_nc: bigint
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null // Sem histórico para comparar
  return Math.round(((current - previous) / previous) * 100)
}

function formatDateDisplay(d: Date, diasNum?: number) {
  if (diasNum === 1 || !diasNum) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE })
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: APP_TIMEZONE }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE })
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

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)
  const periodoAnteriorInicio = new Date(periodoInicio.getTime() - diasNum * 24 * 60 * 60 * 1000)
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const pointCond = pontoId ? { collection_point_id: pontoId } : {}
  const maxPreventiveDate = new Date()
  maxPreventiveDate.setDate(maxPreventiveDate.getDate() + 30)

  // PHASE 1: Independent queries
  const [pt, parametersRaw] = await Promise.all([
    pontoId ? prisma.collectionPoint.findUnique({ where: { id: pontoId, tenant_id }, select: { name: true } }) : Promise.resolve(null),
    prisma.qualityParameter.findMany({ where: { tenant_id, is_active: true }, select: { id: true, name: true, unit: true, min_limit: true, max_limit: true } }),
  ])
  const activePointName = pt ? pt.name : null
  
  let selectedParam = null
  if (paramId) {
    selectedParam = parametersRaw.find(p => p.id === paramId) || parametersRaw[0]
  } else if (parametersRaw.length > 0) {
    const topParam = await prisma.reading.groupBy({
      by: ['parameter_id'],
      where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond },
      _count: { parameter_id: true },
      orderBy: { _count: { parameter_id: 'desc' } },
      take: 1
    })
    if (topParam.length > 0) {
      selectedParam = parametersRaw.find(p => p.id === topParam[0].parameter_id) || parametersRaw[0]
    } else {
      selectedParam = parametersRaw[0]
    }
  }

  // Filtro opcional de ponto para os counts em SQL bruto
  const pointSql = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // As ~24 contagens por período viram 1 query por tabela via COUNT(*) FILTER.
  // Validado 1:1 contra as contagens antigas (readings/analyses/external/occ,
  // com e sem filtro de ponto, para 24h/7d/30d). table/dateCol são literais
  // controlados (Prisma.raw) — sem injeção.
  const measCounts = (table: Prisma.Sql, dateCol: Prisma.Sql) =>
    prisma.$queryRaw<MeasCountRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE ${dateCol} >= ${today}) AS today,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${yesterday} AND ${dateCol} < ${today}) AS yesterday,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${periodoInicio}) AS total_current,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${periodoInicio} AND is_non_conformant = true) AS nc_current,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${periodoAnteriorInicio} AND ${dateCol} < ${periodoInicio}) AS total_prev,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${periodoAnteriorInicio} AND ${dateCol} < ${periodoInicio} AND is_non_conformant = true) AS nc_prev,
        COUNT(*) FILTER (WHERE ${dateCol} >= ${today} AND is_non_conformant = true) AS today_nc
      FROM ${table}
      WHERE tenant_id = ${tenant_id} ${pointSql}
    `)

  const [
    readingCountsRow, analysisCountsRow, externalCountsRow, occCountsRow,
    readsLast7Days, analysesLast7Days, externalLast7Days,
    schedules,
    collectionPointsRaw,
    occurrencesBySeverity,
    chemicalExitsRaw,
    trendReads, trendAnalyses, trendExternals,
    auditFeed,
    pendingMaintenances,
    shiftScales,
    latestReading, latestAnalysis, latestExternal,
    latestNCReading, latestNCAnalysis, latestNCExternal,
    activeOccurrences
  ] = await Promise.all([
    // Contagens consolidadas — 4 queries no lugar de ~24 counts
    measCounts(Prisma.raw('readings'), Prisma.raw('created_at')),
    measCounts(Prisma.raw('analyses'), Prisma.raw('collected_at')),
    measCounts(Prisma.raw('external_analyses'), Prisma.raw('collected_at')),
    prisma.$queryRaw<Array<{ open_total: bigint; open_critical: bigint; open_other: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') ${pointSql}) AS open_total,
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity = 'CRITICAL') AS open_critical,
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity IN ('HIGH','MEDIUM','LOW')) AS open_other
      FROM occurrences
      WHERE tenant_id = ${tenant_id}
    `),
    // Sparkline
    prisma.reading.findMany({ where: { tenant_id, created_at: { gte: sevenDaysAgo }, ...pointCond }, select: { created_at: true } }),
    prisma.analysis.findMany({ where: { tenant_id, collected_at: { gte: sevenDaysAgo }, ...pointCond }, select: { collected_at: true } }),
    prisma.externalAnalysis.findMany({ where: { tenant_id, collected_at: { gte: sevenDaysAgo }, ...pointCond }, select: { collected_at: true } }),
    // Monitoring Schedule
    prisma.monitoringSchedule.findMany({ where: { tenant_id, is_active: true } }),
    // Heatmap
    prisma.collectionPoint.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true, name: true,
        readings: { where: { created_at: { gte: last24h } }, select: { is_non_conformant: true } },
        analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
        external_analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
      },
    }),
    // Ocorrencias by severity
    prisma.occurrence.groupBy({ by: ['severity'], where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond }, _count: { severity: true } }),
    // Chemical exits
    prisma.chemicalStockExit.findMany({ where: { tenant_id, used_at: { gte: periodoInicio } }, include: { product: { select: { name: true, unit: true } } } }),
    // Trend Data
    selectedParam ? prisma.reading.findMany({ where: { tenant_id, parameter_id: selectedParam.id, created_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, created_at: true } }) : Promise.resolve([]),
    selectedParam ? prisma.analysis.findMany({ where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true, laboratory_type: true } }) : Promise.resolve([]),
    selectedParam ? prisma.externalAnalysis.findMany({ where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true } }) : Promise.resolve([]),
    // Feed and Widgets
    prisma.auditLog.findMany({ where: { tenant_id }, orderBy: { timestamp: 'desc' }, take: 5, include: { user: { select: { name: true } } } }),
    prisma.preventiveMaintenance.findMany({ where: { tenant_id, status: 'SCHEDULED', scheduled_date: { lte: maxPreventiveDate } }, orderBy: { scheduled_date: 'asc' }, include: { equipment: { select: { id: true, name: true } } } }),
    prisma.shiftScale.findMany({ where: { tenant_id, date: today }, include: { operator: { select: { name: true } }, shift: { select: { name: true, start_time: true, end_time: true, crosses_midnight: true } } } }),
    prisma.reading.findFirst({ where: { tenant_id }, orderBy: { recorded_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.analysis.findFirst({ where: { tenant_id }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.externalAnalysis.findFirst({ where: { tenant_id }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.reading.findFirst({ where: { tenant_id, created_at: { gte: today }, is_non_conformant: true }, orderBy: { recorded_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.analysis.findFirst({ where: { tenant_id, collected_at: { gte: today }, is_non_conformant: true }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.externalAnalysis.findFirst({ where: { tenant_id, collected_at: { gte: today }, is_non_conformant: true }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.occurrence.findMany({ where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...pointCond }, orderBy: { created_at: 'desc' }, include: { reporter: { select: { name: true } }, collection_point: { select: { name: true } } } })
  ])

  // Deriva os escalares a partir das contagens consolidadas
  const rc = readingCountsRow[0], ac = analysisCountsRow[0], ec = externalCountsRow[0], occ = occCountsRow[0]
  const readingsToday = num(rc.today), readingsYesterday = num(rc.yesterday)
  const analysesToday = num(ac.today), analysesYesterday = num(ac.yesterday)
  const externalToday = num(ec.today), externalYesterday = num(ec.yesterday)
  const totalReadsCurrent = num(rc.total_current), nonConformReadsCurrent = num(rc.nc_current), totalReadsPrev = num(rc.total_prev), nonConformReadsPrev = num(rc.nc_prev)
  const totalAnalysesCurrent = num(ac.total_current), nonConformAnalysesCurrent = num(ac.nc_current), totalAnalysesPrev = num(ac.total_prev), nonConformAnalysesPrev = num(ac.nc_prev)
  const totalExternalCurrent = num(ec.total_current), nonConformExternalCurrent = num(ec.nc_current), totalExternalPrev = num(ec.total_prev), nonConformExternalPrev = num(ec.nc_prev)
  const nonConformReadingsTodayCount = num(rc.today_nc), nonConformAnalysesTodayCount = num(ac.today_nc), nonConformExternalTodayCount = num(ec.today_nc)
  const openOccurrences = num(occ.open_total), openCriticalOccCount = num(occ.open_critical), openOtherOccCount = num(occ.open_other)

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

  // CHEMICAL CONSUMPTION
  const chemicalConsumptionMap = new Map<string, { name: string, unit: string, total: number }>()
  chemicalExitsRaw.forEach(exit => {
    const key = exit.product_id
    if (!chemicalConsumptionMap.has(key)) {
      chemicalConsumptionMap.set(key, { name: exit.product.name, unit: exit.product.unit, total: 0 })
    }
    chemicalConsumptionMap.get(key)!.total += exit.quantity
  })
  const chemicalConsumptionData = Array.from(chemicalConsumptionMap.values()).sort((a, b) => b.total - a.total)

  // HEATMAP
  const heatmapPoints = collectionPointsRaw.map(cp => {
    const hasNonConform = cp.readings.some(r => r.is_non_conformant) || 
                          cp.analyses.some(a => a.is_non_conformant) || 
                          cp.external_analyses.some(e => e.is_non_conformant)
    
    const hasAnyReadings = cp.readings.length > 0 || cp.analyses.length > 0 || cp.external_analyses.length > 0
    let status: 'OK' | 'WARNING' | 'DANGER' = 'OK'
    if (hasNonConform) status = 'DANGER'
    else if (!hasAnyReadings) status = 'WARNING' 
    return { id: cp.id, name: cp.name, status }
  })

  const severityColors: Record<string, string> = {
    LOW: '#64748b', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444'
  }
  const severityLabels: Record<string, string> = {
    LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica'
  }
  
  const occurrencesPieData = occurrencesBySeverity.map(o => ({
    name: severityLabels[o.severity] || o.severity,
    value: o._count.severity,
    color: severityColors[o.severity] || '#94a3b8'
  }))

  // TREND DATA
  let trendData: any[] = []
  if (selectedParam) {
    trendData = [
      ...trendReads.map(a => ({ time: a.created_at, timeStr: formatDateDisplay(a.created_at, diasNum), value: a.value, minLimit: null, maxLimit: null, laboratoryType: 'FIELD' })),
      ...trendAnalyses.map(a => ({ time: a.collected_at, timeStr: formatDateDisplay(a.collected_at, diasNum), value: a.value, minLimit: a.min_limit_applied, maxLimit: a.max_limit_applied, laboratoryType: a.laboratory_type })),
      ...trendExternals.map(a => ({ time: a.collected_at, timeStr: formatDateDisplay(a.collected_at, diasNum), value: a.value, minLimit: a.min_limit_applied, maxLimit: a.max_limit_applied, laboratoryType: 'EXTERNAL' }))
    ]
    trendData.sort((a, b) => a.time.getTime() - b.time.getTime())
  }

  // Determinar operador ativo
  function isTimeInShift(startStr: string, endStr: string, crossesMidnight: boolean, currentHour: number, currentMinute: number): boolean {
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const currentMinutes = currentHour * 60 + currentMinute
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    if (crossesMidnight) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    } else {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
  }

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const activeScale = shiftScales.find(sc => 
    isTimeInShift(sc.shift.start_time, sc.shift.end_time, sc.shift.crosses_midnight, currentHour, currentMinute)
  )
  const activeOperatorName = activeScale?.operator.name || null
  const activeShiftName = activeScale?.shift.name || null

  let eteStatus: 'OK' | 'WARNING' | 'DANGER' = 'OK'
  if (openCriticalOccCount > 0) {
    eteStatus = 'DANGER'
  } else if (openOtherOccCount > 0 || nonConformReadingsTodayCount > 0 || nonConformAnalysesTodayCount > 0 || nonConformExternalTodayCount > 0) {
    eteStatus = 'WARNING'
  }

  const candidates = [
    latestReading && { date: latestReading.recorded_at, parameterName: latestReading.parameter?.name || 'Observação', pointName: latestReading.collection_point.name, value: latestReading.value, unit: latestReading.unit || '', isNonConformant: latestReading.is_non_conformant ?? false },
    latestAnalysis && { date: latestAnalysis.collected_at, parameterName: latestAnalysis.parameter.name, pointName: latestAnalysis.collection_point.name, value: latestAnalysis.value, unit: latestAnalysis.unit, isNonConformant: latestAnalysis.is_non_conformant },
    latestExternal && { date: latestExternal.collected_at, parameterName: latestExternal.parameter.name, pointName: latestExternal.collection_point.name, value: latestExternal.value, unit: latestExternal.unit, isNonConformant: latestExternal.is_non_conformant ?? false }
  ].filter(Boolean) as any[]

  let absoluteLatest: any = null
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.date.getTime() - a.date.getTime())
    absoluteLatest = candidates[0]
  }

  const ncCandidates = [
    latestNCReading && { date: latestNCReading.recorded_at, parameterName: latestNCReading.parameter?.name || 'Observação', pointName: latestNCReading.collection_point.name, value: latestNCReading.value, unit: latestNCReading.unit || '' },
    latestNCAnalysis && { date: latestNCAnalysis.collected_at, parameterName: latestNCAnalysis.parameter.name, pointName: latestNCAnalysis.collection_point.name, value: latestNCAnalysis.value, unit: latestNCAnalysis.unit },
    latestNCExternal && { date: latestNCExternal.collected_at, parameterName: latestNCExternal.parameter.name, pointName: latestNCExternal.collection_point.name, value: latestNCExternal.value, unit: latestNCExternal.unit }
  ].filter(Boolean) as any[]

  let latestNCToday: any = null
  if (ncCandidates.length > 0) {
    ncCandidates.sort((a, b) => b.date.getTime() - a.date.getTime())
    latestNCToday = ncCandidates[0]
  }

  const severityWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  const sortedOccurrences = [...activeOccurrences].sort((a, b) => {
    const wA = severityWeights[a.severity] || 0
    const wB = severityWeights[b.severity] || 0
    if (wA !== wB) return wB - wA
    return b.created_at.getTime() - a.created_at.getTime()
  })

  const dbFeed = auditFeed.map(log => {
    let text = 'registrou uma atividade.'
    let type = 'ok'
    if (log.table_name === 'readings') { text = 'registrou uma leitura de campo.'; type = 'reading' }
    if (log.table_name === 'analyses') { text = 'registrou análise interna.'; type = 'reading' }
    if (log.table_name === 'external_analyses') { text = 'importou laudo externo.'; type = 'reading' }
    if (log.table_name === 'occurrences') { text = 'abriu/atualizou uma ocorrência.'; type = 'alert' }
    if (log.table_name === 'chemical_stock_exits') { text = 'lançou consumo de químicos.'; type = 'chem' }
    if (log.table_name === 'shift_instances') { text = 'atualizou status de um turno.'; type = 'shift' }

    return { time: formatDateDisplay(log.timestamp), who: log.user ? log.user.name : 'Sistema', text, type }
  })

  const dbMaintenance = pendingMaintenances.map(m => {
    const diffTime = m.scheduled_date.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return { id: m.id, name: m.equipment.name, equipmentId: m.equipment_id, scheduledDate: m.scheduled_date.toISOString(), days }
  })

  return (
    <DashboardClient 
      dbTotalRegistersToday={totalRegistersToday}
      dbRegistersDelta={registersDelta}
      dbProgress={dbProgress}
      dbOpenOccurrences={openOccurrences}
      dbConfCurrent={confCurrent}
      dbConfDelta={confDelta}
      dbSparklineData={sparklineData}
      dbHeatmapPoints={heatmapPoints}
      dbCriticalOccurrences={sortedOccurrences}
      dbOccurrencesPieData={occurrencesPieData}
      dbChemicalConsumptionData={chemicalConsumptionData}
      dbTrendData={trendData}
      dbFeed={dbFeed}
      dbMaintenance={dbMaintenance}
      dbParameters={parametersRaw}
      dbSelectedParam={selectedParam}
      diasNum={diasNum}
      paramId={selectedParam?.id || paramId}
      pontoId={pontoId}
      activePointName={activePointName}
      eteStatus={eteStatus}
      activeOperatorName={activeOperatorName}
      activeShiftName={activeShiftName}
      absoluteLatestReading={absoluteLatest}
      latestNCToday={latestNCToday}
    />
  )
}
