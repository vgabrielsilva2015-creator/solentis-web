import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisChart } from './analysis-chart'
import { getTenantId } from '@/lib/tenant'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ parameter_id?: string; days?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { parameter_id, days: daysParam } = await searchParams
  const days = daysParam === '90' ? MAX_DAYS : DEFAULT_DAYS

  const parameters = await prisma.qualityParameter.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
    orderBy: { name: 'asc' },
  })

  const selectedParam = parameters.find((p) => p.id === parameter_id) ?? null

  const since = new Date()
  since.setDate(since.getDate() - days)

  const dataPoints = selectedParam
    ? await prisma.analysis.findMany({
        where: {
          tenant_id:    (await getTenantId()),
          parameter_id: selectedParam.id,
          collected_at: { gte: since },
        },
        select:  { collected_at: true, value: true, is_non_conformant: true },
        orderBy: { collected_at: 'asc' },
        take:    500,
      })
    : []

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/tecnico/analises" label="Análises" />
          <h1 className="text-xl font-semibold mt-1">Histórico</h1>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-48">
            <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
              Parâmetro
            </label>
            <select
              id="parameter_id" name="parameter_id"
              defaultValue={parameter_id ?? ''}
              className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Selecione…</option>
              {parameters.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="days" className="text-sm font-medium text-slate-300">Período</label>
            <select
              id="days" name="days"
              defaultValue={String(days)}
              className="rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Ver
          </button>
        </form>

        {/* Gráfico */}
        {!selectedParam ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Selecione um parâmetro para ver o histórico.
          </div>
        ) : dataPoints.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Nenhuma análise nos últimos {days} dias para {selectedParam.name}.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium">
                {selectedParam.name}
                <span className="ml-2 text-sm font-normal text-slate-400">{selectedParam.unit}</span>
              </h2>
              <span className="text-xs text-slate-500">{dataPoints.length} medição(ões)</span>
            </div>
            <AnalysisChart
              data={dataPoints.map((d) => ({
                date:            d.collected_at.toISOString(),
                value:           d.value ?? 0,
                isNonConformant: d.is_non_conformant,
              }))}
              unit={selectedParam.unit}
              minLimit={selectedParam.min_limit}
              maxLimit={selectedParam.max_limit}
            />
          </div>
        )}
    </main>
  )
}
