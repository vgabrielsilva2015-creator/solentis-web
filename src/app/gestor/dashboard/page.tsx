import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { NonConformChart } from './nonconform-chart'

const TENANT_ID = 'default'

const FEATURES = [
  { title: 'Usuários',          href: '/gestor/usuarios',              desc: 'Cadastro e gerenciamento de contas',      active: true },
  { title: 'Parâmetros',        href: '/gestor/parametros',            desc: 'Limites de qualidade e histórico CONAMA', active: true },
  { title: 'Configurações',     href: '/gestor/metodos',               desc: 'Métodos, categorias, pontos e turnos',    active: true },
  { title: 'Produtos Químicos', href: '/gestor/produtos-quimicos',     desc: 'Estoque, entradas e movimentação',        active: true },
  { title: 'Leituras',          href: '/operador/leituras',            desc: 'Registros de campo por turno',            active: true },
  { title: 'Análises',          href: '/tecnico/analises',             desc: 'Análises laboratoriais',                  active: true },
  { title: 'Equipamentos',      href: '/tecnico/equipamentos',         desc: 'Cadastro e manutenção preventiva',        active: true },
  { title: 'Ocorrências',       href: '/tecnico/ocorrencias',          desc: 'Gestão de incidentes e resoluções',       active: true },
  { title: 'Turnos',            href: '/gestor/turnos/instancias',     desc: 'Histórico e passagens de turno',          active: true },
]

const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Crítica',  color: 'text-red-400',    bg: 'bg-red-950/30',    border: 'border-red-800/50'    },
  HIGH:     { label: 'Alta',     color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-800/50' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400',  bg: 'bg-amber-950/30',  border: 'border-amber-800/50'  },
  LOW:      { label: 'Baixa',    color: 'text-slate-300',  bg: 'bg-slate-800/50',  border: 'border-slate-700'     },
} as const

export default async function GestorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>
}) {
  const { dias: diasParam } = await searchParams
  const diasValidos = [7, 30, 90] as const
  type Dias = typeof diasValidos[number]
  const diasNum = diasValidos.includes(Number(diasParam) as Dias)
    ? (Number(diasParam) as Dias)
    : 30

  const now   = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const [
    activeUsersCount,
    nonConformOpenCount,
    openOccurrencesCount,
    overduePreventic,
    criticalCorrectivas,
    overdueOccurrences,
    occurrencesBySeverityRaw,
    nonConformByParamRaw,
    parameterNames,
    chemicalProducts,
  ] = await Promise.all([
    // Usuários ativos
    prisma.user.count({ where: { tenant_id: TENANT_ID, is_active: true } }),

    // Não-conformidades abertas (n.c. sem aprovação)
    prisma.analysis.count({
      where: { tenant_id: TENANT_ID, is_non_conformant: true, approved_by: null },
    }),

    // Ocorrências abertas (total)
    prisma.occurrence.count({
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),

    // Alertas: preventivas vencidas
    prisma.preventiveMaintenance.count({
      where: {
        tenant_id:      TENANT_ID,
        status:         'SCHEDULED',
        scheduled_date: { lt: today },
        equipment:      { is_active: true },
      },
    }),

    // Alertas: corretivas HIGH/CRITICAL em andamento
    prisma.correctiveMaintenance.count({
      where: {
        tenant_id: TENANT_ID,
        status:    'IN_PROGRESS',
        priority:  { in: ['HIGH', 'CRITICAL'] },
      },
    }),

    // Alertas: ocorrências com prazo vencido
    prisma.occurrence.count({
      where: {
        tenant_id: TENANT_ID,
        status:    { in: ['OPEN', 'IN_PROGRESS'] },
        deadline:  { lt: now },
      },
    }),

    // Ocorrências abertas por severidade
    prisma.occurrence.groupBy({
      by:    ['severity'],
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      _count: { id: true },
    }),

    // Não-conformidades por parâmetro (período selecionado)
    prisma.analysis.groupBy({
      by:    ['parameter_id'],
      where: {
        tenant_id:       TENANT_ID,
        is_non_conformant: true,
        collected_at:    { gte: periodoInicio },
      },
      _count:   { id: true },
      orderBy:  { _count: { id: 'desc' } },
      take:     8,
    }),

    // Nomes dos parâmetros (para o gráfico)
    prisma.qualityParameter.findMany({
      where:  { tenant_id: TENANT_ID },
      select: { id: true, name: true },
    }),

    // Estoque abaixo do mínimo (calculado + físico)
    prisma.chemicalProduct.findMany({
      where:  { tenant_id: TENANT_ID, is_active: true },
      select: {
        min_stock: true,
        entries:   { select: { quantity: true } },
        exits:     { select: { quantity: true } },
        counts:    { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
      },
    }),
  ])

  // Estoque baixo: calculado < min OU físico < min
  const lowStockCount = chemicalProducts.filter((p) => {
    const calc   = p.entries.reduce((s, e) => s + e.quantity, 0) - p.exits.reduce((s, e) => s + e.quantity, 0)
    const fisico = p.counts[0]?.counted_quantity ?? null
    return calc < p.min_stock || (fisico !== null && fisico < p.min_stock)
  }).length

  // Mapa de nomes de parâmetro para o gráfico
  const paramMap = new Map(parameterNames.map((p) => [p.id, p.name]))
  const nonConformChartData = nonConformByParamRaw.map((g) => ({
    paramName: paramMap.get(g.parameter_id) ?? g.parameter_id,
    count:     g._count.id,
  }))

  // Mapa de contagem por severidade
  const sevMap = new Map(occurrencesBySeverityRaw.map((g) => [g.severity, g._count.id]))

  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">Visão geral do sistema.</p>
      </div>

      {/* ── Seção 1: KPI Cards ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Usuários ativos',
            value: activeUsersCount,
            href:  '/gestor/usuarios',
            alert: false,
            color: 'text-slate-100',
          },
          {
            label: 'Não-conform. em aberto',
            value: nonConformOpenCount,
            href:  '#',
            alert: nonConformOpenCount > 0,
            color: nonConformOpenCount > 0 ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Ocorrências abertas',
            value: openOccurrencesCount,
            href:  '#',
            alert: openOccurrencesCount > 0,
            color: openOccurrencesCount > 0 ? 'text-amber-400' : 'text-slate-100',
          },
          {
            label: 'Estoque abaixo do mínimo',
            value: lowStockCount,
            href:  '/gestor/produtos-quimicos',
            alert: lowStockCount > 0,
            color: lowStockCount > 0 ? 'text-red-400' : 'text-slate-100',
          },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={[
              'rounded-xl border p-4 hover:opacity-90 transition-opacity',
              kpi.alert ? 'border-red-900/50 bg-red-950/10' : 'border-slate-700 bg-slate-900',
            ].join(' ')}
          >
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{kpi.label}</p>
          </Link>
        ))}
      </section>

      {/* ── Seção 2: Alertas operacionais ───────────────────────────────────── */}
      {(overduePreventic > 0 || criticalCorrectivas > 0 || overdueOccurrences > 0) && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Alertas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {overduePreventic > 0 && (
              <Link
                href="/tecnico/equipamentos"
                className="flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 hover:bg-red-950/30 transition-colors"
              >
                <span className="text-2xl font-bold text-red-400">{overduePreventic}</span>
                <span className="text-xs text-red-300 leading-snug">Preventiva(s) vencida(s)</span>
              </Link>
            )}
            {criticalCorrectivas > 0 && (
              <Link
                href="/tecnico/equipamentos"
                className="flex items-center gap-3 rounded-xl border border-orange-800/50 bg-orange-950/20 px-4 py-3 hover:bg-orange-950/30 transition-colors"
              >
                <span className="text-2xl font-bold text-orange-400">{criticalCorrectivas}</span>
                <span className="text-xs text-orange-300 leading-snug">Corretiva(s) crítica(s)</span>
              </Link>
            )}
            {overdueOccurrences > 0 && (
              <Link
                href="#"
                className="flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 hover:bg-red-950/30 transition-colors animate-pulse"
              >
                <span className="text-2xl font-bold text-red-400">{overdueOccurrences}</span>
                <span className="text-xs text-red-300 leading-snug">Ocorrência(s) com prazo vencido</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Seção 3: Gráficos ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Não-conformidades por parâmetro */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-300">Não-conformidades por parâmetro</h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map((d) => (
                <Link
                  key={d}
                  href={`/gestor/dashboard?dias=${d}`}
                  className={[
                    'rounded px-2 py-0.5 text-xs transition-colors',
                    diasNum === d
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {d}d
                </Link>
              ))}
            </div>
          </div>
          <NonConformChart data={nonConformChartData} />
        </div>

        {/* Ocorrências abertas por severidade */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Ocorrências abertas por severidade</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const cfg   = SEVERITY_CONFIG[sev]
              const count = sevMap.get(sev) ?? 0
              return (
                <div
                  key={sev}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
                >
                  <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                  <p className="text-xs text-slate-500 mt-1">{cfg.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Seção 4: Navegação ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Módulos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`space-y-2 rounded-xl border bg-slate-900 p-5 ${
                f.active ? 'border-slate-700' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-200">{f.title}</h3>
                {!f.active && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                    Em breve
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{f.desc}</p>
              {f.active && f.href !== '#' && (
                <Link href={f.href} className="mt-1 block text-xs text-emerald-400 hover:text-emerald-300">
                  Acessar →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
