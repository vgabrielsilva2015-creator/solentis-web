import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'

export const getMeasCountsCached = unstable_cache(
  async (tenant_id: string, table: string, dateCol: string, todayIso: string, yesterdayIso: string, periodoInicioIso: string, periodoAnteriorInicioIso: string, pontoId?: string) => {
    const pointSql = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
    
    const tableNameRaw = Prisma.raw(table)
    const dateColRaw = Prisma.raw(dateCol)
    
    // We pass ISO strings for caching and parse them here
    const today = new Date(todayIso)
    const yesterday = new Date(yesterdayIso)
    const periodoInicio = new Date(periodoInicioIso)
    const periodoAnteriorInicio = new Date(periodoAnteriorInicioIso)

    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${today}) AS today,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${yesterday} AND ${dateColRaw} < ${today}) AS yesterday,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${periodoInicio}) AS total_current,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${periodoInicio} AND is_non_conformant = true) AS nc_current,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${periodoAnteriorInicio} AND ${dateColRaw} < ${periodoInicio}) AS total_prev,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${periodoAnteriorInicio} AND ${dateColRaw} < ${periodoInicio} AND is_non_conformant = true) AS nc_prev,
        COUNT(*) FILTER (WHERE ${dateColRaw} >= ${today} AND is_non_conformant = true) AS today_nc
      FROM ${tableNameRaw}
      WHERE tenant_id = ${tenant_id} 
        AND ${dateColRaw} >= ${periodoAnteriorInicio}
        ${pointSql}
    `)
  },
  ['meas-counts'],
  { revalidate: 60 }
)

export const getOccurrencesCountsCached = unstable_cache(
  async (tenant_id: string, pontoId?: string) => {
    const pointSql = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
    return prisma.$queryRaw<Array<{ open_total: bigint; open_critical: bigint; open_other: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') ${pointSql}) AS open_total,
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity = 'CRITICAL') AS open_critical,
        COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity IN ('HIGH','MEDIUM','LOW')) AS open_other
      FROM occurrences
      WHERE tenant_id = ${tenant_id}
    `)
  },
  ['occ-counts'],
  { revalidate: 60 }
)

export const getHeatmapPointsCached = unstable_cache(
  async (tenant_id: string, last24hIso: string) => {
    const last24h = new Date(last24hIso)
    return prisma.collectionPoint.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true, name: true,
        readings: { where: { created_at: { gte: last24h } }, select: { is_non_conformant: true } },
        analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
        external_analyses: { where: { collected_at: { gte: last24h } }, select: { is_non_conformant: true } },
      },
    })
  },
  ['heatmap-points'],
  { revalidate: 60 }
)

export const getTrendDataCached = unstable_cache(
  async (tenant_id: string, paramId: string, periodoInicioIso: string, pontoId?: string) => {
    const periodoInicio = new Date(periodoInicioIso)
    const pointCond = pontoId ? { collection_point_id: pontoId } : {}
    
    const [trendReads, trendAnalyses, trendExternals] = await Promise.all([
      prisma.reading.findMany({ where: { tenant_id, parameter_id: paramId, created_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, created_at: true } }),
      prisma.analysis.findMany({ where: { tenant_id, parameter_id: paramId, collected_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true, laboratory_type: true } }),
      prisma.externalAnalysis.findMany({ where: { tenant_id, parameter_id: paramId, collected_at: { gte: periodoInicio }, ...pointCond }, select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true } })
    ])

    return { trendReads, trendAnalyses, trendExternals }
  },
  ['trend-data'],
  { revalidate: 60 }
)
