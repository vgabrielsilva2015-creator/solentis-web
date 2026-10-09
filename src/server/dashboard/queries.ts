/**
 * Consultas do dashboard do gestor (T-23).
 *
 * Regra: nada aqui traz linha de medição para o servidor só para contar ou desenhar.
 * Contagens, séries e mapa de calor são agregados no banco; listas têm limite.
 * Tudo filtra por `tenant_id` (SQL cru incluído).
 *
 * Cache: as consultas pesadas passam por `comCache`, com chave e etiqueta POR PLANTA
 * (`dashboard:<tenantId>`). Ocorrências abertas e o status da ETE não passam pelo cache:
 * uma ocorrência crítica nova aparece na hora.
 */
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

// COUNT retorna bigint no $queryRaw
const num = (v: unknown): number => Number(v ?? 0)

/** Máximo de pontos por série no gráfico de tendência (por origem). */
export const TREND_MAX_POINTS = 300
/** Em série decimada, as não conformidades mais recentes continuam todas visíveis até este teto. */
export const TREND_MAX_NC = 40
/** Alertas listados no painel (o total real vem das contagens). */
export const ALERTAS_NO_PAINEL = 20
export const MANUTENCOES_NO_PAINEL = 30

// ─── Cache por planta ─────────────────────────────────────────────────────────

export function ttlCache(): number {
  const raw = process.env.DASHBOARD_CACHE_TTL
  if (raw === undefined || raw === '') return 60
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 60
}

export const tagDaPlanta = (tenantId: string) => `dashboard:${tenantId}`

/**
 * Executa `fn` com cache de `ttlCache()` segundos. A chave SEMPRE começa pela planta e pelo
 * nome da consulta; os argumentos (datas já arredondadas ao minuto, filtros) completam a chave.
 * `DASHBOARD_CACHE_TTL=0` desliga o cache (volta ao comportamento sem cache).
 */
export function comCache<A extends unknown[], R>(
  nome: string,
  tenantId: string,
  fn: (...args: A) => Promise<R>,
  ...args: A
): Promise<R> {
  const ttl = ttlCache()
  if (ttl === 0) return fn(...args)
  return unstable_cache(fn, ['dashboard', tenantId, nome], {
    revalidate: ttl,
    tags: [tagDaPlanta(tenantId)],
  })(...args)
}

/** Arredonda ao minuto: dois acessos no mesmo minuto usam a mesma chave de cache. */
export const aoMinuto = (d: Date) => new Date(Math.floor(d.getTime() / 60000) * 60000).toISOString()

// ─── Contagens por período ────────────────────────────────────────────────────

export type ContagemMedicao = {
  today: number; yesterday: number
  total_current: number; nc_current: number
  total_prev: number; nc_prev: number
  today_nc: number
}

type Tabela = 'readings' | 'analyses' | 'external_analyses'
const DATA_COL: Record<Tabela, string> = { readings: 'created_at', analyses: 'collected_at', external_analyses: 'collected_at' }

export async function contarMedicoes(
  tenantId: string, tabela: Tabela,
  todayIso: string, yesterdayIso: string, periodoInicioIso: string, periodoAnteriorInicioIso: string,
  pontoId?: string,
): Promise<ContagemMedicao> {
  const today = new Date(todayIso), yesterday = new Date(yesterdayIso)
  const periodoInicio = new Date(periodoInicioIso), periodoAnteriorInicio = new Date(periodoAnteriorInicioIso)
  const t = Prisma.raw(tabela)
  const d = Prisma.raw(DATA_COL[tabela]) // literais fixos acima — sem injeção
  const ponto = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
  const rows = await prisma.$queryRaw<Array<Record<keyof ContagemMedicao, bigint>>>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE ${d} >= ${today}) AS today,
      COUNT(*) FILTER (WHERE ${d} >= ${yesterday} AND ${d} < ${today}) AS yesterday,
      COUNT(*) FILTER (WHERE ${d} >= ${periodoInicio}) AS total_current,
      COUNT(*) FILTER (WHERE ${d} >= ${periodoInicio} AND is_non_conformant = true) AS nc_current,
      COUNT(*) FILTER (WHERE ${d} >= ${periodoAnteriorInicio} AND ${d} < ${periodoInicio}) AS total_prev,
      COUNT(*) FILTER (WHERE ${d} >= ${periodoAnteriorInicio} AND ${d} < ${periodoInicio} AND is_non_conformant = true) AS nc_prev,
      COUNT(*) FILTER (WHERE ${d} >= ${today} AND is_non_conformant = true) AS today_nc
    FROM ${t}
    WHERE tenant_id = ${tenantId}
      AND ${d} >= ${periodoAnteriorInicio}
      ${ponto}
  `)
  const r = rows[0]
  return {
    today: num(r?.today), yesterday: num(r?.yesterday),
    total_current: num(r?.total_current), nc_current: num(r?.nc_current),
    total_prev: num(r?.total_prev), nc_prev: num(r?.nc_prev),
    today_nc: num(r?.today_nc),
  }
}

export type ContagemOcorrencias = { open_total: number; open_critical: number; open_other: number }

/** Sem cache de propósito: o status da ETE depende disto. */
export async function contarOcorrenciasAbertas(tenantId: string, pontoId?: string): Promise<ContagemOcorrencias> {
  const ponto = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
  const rows = await prisma.$queryRaw<Array<Record<keyof ContagemOcorrencias, bigint>>>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS')) AS open_total,
      COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity = 'CRITICAL') AS open_critical,
      COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND severity IN ('HIGH','MEDIUM','LOW')) AS open_other
    FROM occurrences
    WHERE tenant_id = ${tenantId}
      ${ponto}
  `)
  const r = rows[0]
  return { open_total: num(r?.open_total), open_critical: num(r?.open_critical), open_other: num(r?.open_other) }
}

// ─── Série de 7 dias (sparkline) ──────────────────────────────────────────────

/** Registros por dia nos últimos 7 dias (índice 6 = últimas 24 h). Agregado no banco. */
export async function serieSeteDias(tenantId: string, nowIso: string, pontoId?: string): Promise<number[]> {
  const now = new Date(nowIso)
  const desde = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ponto = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
  const rows = await prisma.$queryRaw<Array<{ dia: number; n: bigint }>>(Prisma.sql`
    SELECT dia, COUNT(*) AS n FROM (
      SELECT floor(abs(extract(epoch FROM (${now}::timestamp - created_at))) / 86400)::int AS dia
        FROM readings WHERE tenant_id = ${tenantId} AND created_at >= ${desde} ${ponto}
      UNION ALL
      SELECT floor(abs(extract(epoch FROM (${now}::timestamp - collected_at))) / 86400)::int AS dia
        FROM analyses WHERE tenant_id = ${tenantId} AND collected_at >= ${desde} ${ponto}
      UNION ALL
      SELECT floor(abs(extract(epoch FROM (${now}::timestamp - collected_at))) / 86400)::int AS dia
        FROM external_analyses WHERE tenant_id = ${tenantId} AND collected_at >= ${desde} ${ponto}
    ) t
    WHERE dia >= 0 AND dia < 7
    GROUP BY dia
  `)
  const out = Array(7).fill(0)
  for (const r of rows) out[6 - r.dia] += num(r.n)
  return out
}

// ─── Mapa de calor ────────────────────────────────────────────────────────────

export type PontoCalor = { id: string; name: string; status: 'OK' | 'WARNING' | 'DANGER' }

/** Status por ponto nas últimas 24 h: DANGER se houve não conformidade, WARNING se não houve medição. */
export async function mapaDeCalor(tenantId: string, last24hIso: string): Promise<PontoCalor[]> {
  const desde = new Date(last24hIso)
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; n: bigint; nc: bigint }>>(Prisma.sql`
    SELECT cp.id, cp.name, COALESCE(a.n, 0) AS n, COALESCE(a.nc, 0) AS nc
    FROM collection_points cp
    LEFT JOIN (
      SELECT collection_point_id,
             COUNT(*) AS n,
             COUNT(*) FILTER (WHERE is_non_conformant = true) AS nc
      FROM (
        SELECT collection_point_id, is_non_conformant FROM readings
          WHERE tenant_id = ${tenantId} AND created_at >= ${desde}
        UNION ALL
        SELECT collection_point_id, is_non_conformant FROM analyses
          WHERE tenant_id = ${tenantId} AND collected_at >= ${desde}
        UNION ALL
        SELECT collection_point_id, is_non_conformant FROM external_analyses
          WHERE tenant_id = ${tenantId} AND collected_at >= ${desde}
      ) u
      GROUP BY collection_point_id
    ) a ON a.collection_point_id = cp.id
    WHERE cp.tenant_id = ${tenantId} AND cp.is_active = true
    ORDER BY cp.created_at, cp.id
  `)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: num(r.nc) > 0 ? 'DANGER' : num(r.n) === 0 ? 'WARNING' : 'OK',
  }))
}

// ─── Gráfico de tendência ─────────────────────────────────────────────────────

export type PontoTendencia = {
  time: string // ISO
  value: number | null
  minLimit: number | null
  maxLimit: number | null
  laboratoryType: string
}

type FonteTendencia = { tabela: Tabela; dataCol: string; limites: boolean; lab: Prisma.Sql }

const FONTES_TENDENCIA: FonteTendencia[] = [
  { tabela: 'readings', dataCol: 'created_at', limites: false, lab: Prisma.sql`'FIELD'` },
  { tabela: 'analyses', dataCol: 'collected_at', limites: true, lab: Prisma.sql`laboratory_type` },
  { tabela: 'external_analyses', dataCol: 'collected_at', limites: true, lab: Prisma.sql`'EXTERNAL'` },
]

/**
 * Pontos do gráfico para um parâmetro. Até TREND_MAX_POINTS por origem vem tudo; acima disso
 * a série é decimada (1 a cada N, sempre com o primeiro e o último) e as não conformidades mais
 * recentes (até TREND_MAX_NC) são mantidas. Os totais e percentuais do painel NÃO usam esta série.
 */
export async function serieTendencia(
  tenantId: string, parametroId: string, desdeIso: string, pontoId?: string,
): Promise<PontoTendencia[]> {
  const desde = new Date(desdeIso)
  const ponto = pontoId ? Prisma.sql`AND collection_point_id = ${pontoId}` : Prisma.empty
  const partes = await Promise.all(
    FONTES_TENDENCIA.map(async (f) => {
      const t = Prisma.raw(f.tabela)
      const d = Prisma.raw(f.dataCol)
      const lim = f.limites
        ? Prisma.sql`min_limit_applied AS min_limit, max_limit_applied AS max_limit`
        : Prisma.sql`NULL::float AS min_limit, NULL::float AS max_limit`
      const rows = await prisma.$queryRaw<
        Array<{ ts: Date; value: number | null; min_limit: number | null; max_limit: number | null; lab: string }>
      >(Prisma.sql`
        WITH s AS (
          SELECT ${d} AS ts, value, ${lim}, ${f.lab} AS lab,
                 COALESCE(is_non_conformant, false) AS nc,
                 row_number() OVER (ORDER BY ${d}, id) AS rn,
                 count(*) OVER () AS n,
                 row_number() OVER (PARTITION BY COALESCE(is_non_conformant, false) ORDER BY ${d} DESC, id) AS rk
          FROM ${t}
          WHERE tenant_id = ${tenantId} AND parameter_id = ${parametroId} AND ${d} >= ${desde}
            ${ponto}
        )
        SELECT ts, value, min_limit, max_limit, lab FROM s
        WHERE n <= ${TREND_MAX_POINTS}
           OR rn = 1 OR rn = n
           OR (nc AND rk <= ${TREND_MAX_NC})
           OR (rn - 1) % GREATEST(1, CEIL(n::numeric / ${TREND_MAX_POINTS})::int) = 0
        ORDER BY ts
      `)
      return rows.map((r) => ({
        time: r.ts.toISOString(),
        value: r.value,
        minLimit: r.min_limit,
        maxLimit: r.max_limit,
        laboratoryType: r.lab,
      }))
    }),
  )
  return partes.flat().sort((a, b) => a.time.localeCompare(b.time))
}

/** Parâmetro com mais leituras no período (o gráfico abre nele quando nenhum foi escolhido). */
export async function parametroMaisLido(tenantId: string, desdeIso: string, pontoId?: string): Promise<string | null> {
  const top = await prisma.reading.groupBy({
    by: ['parameter_id'],
    where: { tenant_id: tenantId, created_at: { gte: new Date(desdeIso) }, ...(pontoId ? { collection_point_id: pontoId } : {}) },
    _count: { parameter_id: true },
    orderBy: { _count: { parameter_id: 'desc' } },
    take: 1,
  })
  return top[0]?.parameter_id ?? null
}

// ─── Químicos ─────────────────────────────────────────────────────────────────

export type ConsumoQuimico = { name: string; unit: string; total: number }

export async function consumoQuimicos(tenantId: string, desdeIso: string): Promise<ConsumoQuimico[]> {
  const grupos = await prisma.chemicalStockExit.groupBy({
    by: ['product_id'],
    where: { tenant_id: tenantId, used_at: { gte: new Date(desdeIso) } },
    _sum: { quantity: true },
  })
  if (grupos.length === 0) return []
  const produtos = await prisma.chemicalProduct.findMany({
    where: { tenant_id: tenantId, id: { in: grupos.map((g) => g.product_id) } },
    select: { id: true, name: true, unit: true },
  })
  const porId = new Map(produtos.map((p) => [p.id, p]))
  return grupos
    .map((g) => ({ p: porId.get(g.product_id), total: g._sum.quantity ?? 0 }))
    .filter((x): x is { p: NonNullable<typeof x.p>; total: number } => !!x.p)
    .map((x) => ({ name: x.p.name, unit: x.p.unit, total: x.total }))
    .sort((a, b) => b.total - a.total)
}

// ─── Listas com limite ────────────────────────────────────────────────────────

export type AlertaPainel = {
  id: string
  description: string
  severity: string
  status: string
  created_at: Date
  collection_point: { name: string } | null
}

/** Ocorrências abertas mais graves primeiro (e mais recentes dentro da mesma gravidade). */
export async function alertasAbertos(tenantId: string, pontoId?: string, limite = ALERTAS_NO_PAINEL): Promise<AlertaPainel[]> {
  const ponto = pontoId ? Prisma.sql`AND o.collection_point_id = ${pontoId}` : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{ id: string; description: string; severity: string; status: string; created_at: Date; point_name: string | null }>
  >(Prisma.sql`
    SELECT o.id, left(o.description, 300) AS description, o.severity, o.status, o.created_at, cp.name AS point_name
    FROM occurrences o
    LEFT JOIN collection_points cp ON cp.id = o.collection_point_id AND cp.tenant_id = ${tenantId}
    WHERE o.tenant_id = ${tenantId} AND o.status IN ('OPEN','IN_PROGRESS')
      ${ponto}
    ORDER BY CASE o.severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END DESC,
             o.created_at DESC, o.id
    LIMIT ${limite}
  `)
  return rows.map((r) => ({
    id: r.id, description: r.description, severity: r.severity, status: r.status, created_at: r.created_at,
    collection_point: r.point_name ? { name: r.point_name } : null,
  }))
}

export async function manutencoesProximas(tenantId: string, ateIso: string, limite = MANUTENCOES_NO_PAINEL) {
  return prisma.preventiveMaintenance.findMany({
    where: { tenant_id: tenantId, status: 'SCHEDULED', scheduled_date: { lte: new Date(ateIso) } },
    orderBy: { scheduled_date: 'asc' },
    take: limite,
    include: { equipment: { select: { id: true, name: true } } },
  })
}
