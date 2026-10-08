import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { APP_TIMEZONE } from '@/lib/date-utils'
import { DashboardClient } from './dashboard-client'
import {
  comCache, aoMinuto, contarMedicoes, contarOcorrenciasAbertas, serieSeteDias, mapaDeCalor,
  serieTendencia, parametroMaisLido, consumoQuimicos, alertasAbertos, manutencoesProximas,
} from '@/server/dashboard/queries'



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
  const diasNum = diasValidos.includes(Number(diasParam) as Dias) ? (Number(diasParam) as Dias) : 30

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

  // T-23: nada de linha de medição vem para o servidor só para contar ou desenhar.
  // As consultas pesadas usam cache POR PLANTA (60 s, DASHBOARD_CACHE_TTL=0 desliga);
  // ocorrências abertas e o status da ETE são sempre lidos na hora.
  const iso = {
    now: aoMinuto(now), today: today.toISOString(), yesterday: yesterday.toISOString(),
    inicio: aoMinuto(periodoInicio), anterior: aoMinuto(periodoAnteriorInicio), h24: aoMinuto(last24h),
  }

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
    const topId = await comCache('param-top', tenant_id, parametroMaisLido, tenant_id, iso.inicio, pontoId)
    selectedParam = parametersRaw.find(p => p.id === topId) || parametersRaw[0]
  }

  const [
    readingCounts, analysisCounts, externalCounts, occCounts,
    sparklineData,
    schedules,
    heatmapPoints,
    occurrencesBySeverity,
    chemicalConsumptionData,
    trendRaw,
    auditFeed,
    pendingMaintenances,
    shiftScales,
    latestReading, latestAnalysis, latestExternal,
    latestNCReading, latestNCAnalysis, latestNCExternal,
    sortedOccurrences
  ] = await Promise.all([
    comCache('conta-readings', tenant_id, contarMedicoes, tenant_id, 'readings', iso.today, iso.yesterday, iso.inicio, iso.anterior, pontoId),
    comCache('conta-analyses', tenant_id, contarMedicoes, tenant_id, 'analyses', iso.today, iso.yesterday, iso.inicio, iso.anterior, pontoId),
    comCache('conta-external', tenant_id, contarMedicoes, tenant_id, 'external_analyses', iso.today, iso.yesterday, iso.inicio, iso.anterior, pontoId),
    contarOcorrenciasAbertas(tenant_id, pontoId),
    comCache('sparkline', tenant_id, serieSeteDias, tenant_id, iso.now, pontoId),
    // Monitoring Schedule
    prisma.monitoringSchedule.findMany({ where: { tenant_id, is_active: true } }),
    comCache('heatmap', tenant_id, mapaDeCalor, tenant_id, iso.h24),
    // Ocorrencias by severity
    prisma.occurrence.groupBy({ by: ['severity'], where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond }, _count: { severity: true } }),
    comCache('quimicos', tenant_id, consumoQuimicos, tenant_id, iso.inicio),
    selectedParam ? comCache('tendencia', tenant_id, serieTendencia, tenant_id, selectedParam.id, iso.inicio, pontoId) : Promise.resolve([]),
    // Feed and Widgets
    prisma.auditLog.findMany({ where: { tenant_id }, orderBy: { timestamp: 'desc' }, take: 5, include: { user: { select: { name: true } } } }),
    manutencoesProximas(tenant_id, maxPreventiveDate.toISOString()),
    prisma.shiftScale.findMany({ where: { tenant_id, date: today }, include: { operator: { select: { name: true } }, shift: { select: { name: true, start_time: true, end_time: true, crosses_midnight: true } } } }),
    prisma.reading.findFirst({ where: { tenant_id }, orderBy: { recorded_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.analysis.findFirst({ where: { tenant_id }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.externalAnalysis.findFirst({ where: { tenant_id }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.reading.findFirst({ where: { tenant_id, created_at: { gte: today }, is_non_conformant: true }, orderBy: { recorded_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.analysis.findFirst({ where: { tenant_id, collected_at: { gte: today }, is_non_conformant: true }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    prisma.externalAnalysis.findFirst({ where: { tenant_id, collected_at: { gte: today }, is_non_conformant: true }, orderBy: { collected_at: 'desc' }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } } }),
    // Só os alertas mais graves (20); o total real vem de occCounts
    alertasAbertos(tenant_id, pontoId),
  ])

  // Deriva os escalares a partir das contagens consolidadas
  const rc = readingCounts, ac = analysisCounts, ec = externalCounts, occ = occCounts
  const readingsToday = rc.today, readingsYesterday = rc.yesterday
  const analysesToday = ac.today, analysesYesterday = ac.yesterday
  const externalToday = ec.today, externalYesterday = ec.yesterday
  const totalReadsCurrent = rc.total_current, nonConformReadsCurrent = rc.nc_current, totalReadsPrev = rc.total_prev, nonConformReadsPrev = rc.nc_prev
  const totalAnalysesCurrent = ac.total_current, nonConformAnalysesCurrent = ac.nc_current, totalAnalysesPrev = ac.total_prev, nonConformAnalysesPrev = ac.nc_prev
  const totalExternalCurrent = ec.total_current, nonConformExternalCurrent = ec.nc_current, totalExternalPrev = ec.total_prev, nonConformExternalPrev = ec.nc_prev
  const nonConformReadingsTodayCount = rc.today_nc, nonConformAnalysesTodayCount = ac.today_nc, nonConformExternalTodayCount = ec.today_nc
  const openOccurrences = occ.open_total, openCriticalOccCount = occ.open_critical, openOtherOccCount = occ.open_other

  // Série do gráfico (já decimada no banco): volta a ter Date e o rótulo de hora
  const trendData = trendRaw.map((p) => {
    const time = new Date(p.time)
    return { time, timeStr: formatDateDisplay(time, diasNum), value: p.value, minLimit: p.minLimit, maxLimit: p.maxLimit, laboratoryType: p.laboratoryType }
  })

  // Total Registers Top KPI
  const totalRegistersToday = readingsToday + analysesToday + externalToday
  const totalRegistersYesterday = readingsYesterday + analysesYesterday + externalYesterday
  const registersDelta = calcDelta(totalRegistersToday, totalRegistersYesterday)

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
