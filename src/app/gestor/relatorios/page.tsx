import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { RdoDownloadBtn } from './rdo-download-btn'
import { AutomonitoramentoDownloadBtn } from './automonitoramento-download-btn'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')
  
  const tenantId = await getTenantId()
  const params = await searchParams
  
  // Resolve data alvo
  let targetDate = new Date()
  if (params.data) {
    const parsed = new Date(params.data)
    if (!isNaN(parsed.getTime())) targetDate = parsed
  }
  
  // Limites do dia
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999)

  const [rawLeituras, rawExits, rawOcorrencias, tenant, rawAnalises, rawExterna] = await Promise.all([
    // Leituras
    prisma.reading.findMany({
      where: {
        tenant_id: tenantId,
        recorded_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } }
      },
      orderBy: { recorded_at: 'asc' },
      take: 500
    }),
    // Consumo Químico (saídas de estoque)
    prisma.chemicalStockExit.findMany({
      where: {
        tenant_id: tenantId,
        used_at: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        product: { select: { name: true, unit: true } }
      },
      orderBy: { used_at: 'asc' },
      take: 500
    }),
    // Ocorrências
    prisma.occurrence.findMany({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { created_at: 'asc' },
      take: 500
    }),
    // Dados da Planta
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true }
    }),
    // Análises (Internas) do mês para o automonitoramento
    prisma.analysis.findMany({
      where: { tenant_id: tenantId, collected_at: { gte: startOfMonth, lte: endOfMonth } },
      include: { collection_point: { select: { name: true } }, parameter: { select: { name: true, unit: true } } },
      orderBy: { collected_at: 'asc' },
      take: 500
    }),
    // Análises (Externas) do mês para o automonitoramento
    prisma.externalAnalysis.findMany({
      where: { tenant_id: tenantId, collected_at: { gte: startOfMonth, lte: endOfMonth } },
      include: { collection_point: { select: { name: true } }, parameter: { select: { name: true, unit: true } } },
      orderBy: { collected_at: 'asc' },
      take: 500
    })
  ])

  // Formatadores nativos
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Mapear para o formato do PDF
  const leituras = rawLeituras.map(l => ({
    time: timeFormatter.format(l.recorded_at),
    point: l.collection_point.name,
    parameter: l.parameter?.name ?? 'Leitura Visual',
    value: l.value ?? '-',
    unit: l.parameter?.unit ?? ''
  }))

  const consumosMap = new Map<string, { product: string, quantity: number, unit: string }>()
  rawExits.forEach(e => {
    const key = e.product.name
    if (consumosMap.has(key)) {
      const existing = consumosMap.get(key)!
      existing.quantity += e.quantity
    } else {
      consumosMap.set(key, { product: key, quantity: e.quantity, unit: e.product.unit })
    }
  })
  const consumos = Array.from(consumosMap.values())

  const ocorrencias = rawOcorrencias.map(o => ({
    time: timeFormatter.format(o.created_at),
    description: o.description,
    severity: o.severity
  }))

  const pdfData = {
    dateStr: dateFormatter.format(targetDate),
    generatedBy: session.user.name ?? session.user.email ?? 'Usuário',
    tenantName: tenant?.name ?? 'Planta Principal',
    leituras,
    consumos,
    ocorrencias
  }

  // Mapear análises para o automonitoramento
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
  const analisesFormatted = [
    ...rawAnalises.map(a => ({
      time: dateFormatter.format(a.collected_at),
      point: a.collection_point.name,
      parameter: a.parameter.name,
      value: a.value,
      unit: a.parameter.unit,
      minLimit: a.min_limit_applied,
      maxLimit: a.max_limit_applied,
      isNonConformant: a.is_non_conformant ?? false,
      source: 'Interna'
    })),
    ...rawExterna.map(e => ({
      time: dateFormatter.format(e.collected_at),
      point: e.collection_point.name,
      parameter: e.parameter.name,
      value: e.value,
      unit: e.parameter.unit,
      minLimit: e.min_limit_applied,
      maxLimit: e.max_limit_applied,
      isNonConformant: e.is_non_conformant ?? false,
      source: 'Externa'
    }))
  ].sort((a, b) => a.time.localeCompare(b.time))

  const automonitoramentoData = {
    monthStr: monthFormatter.format(targetDate),
    generatedBy: session.user.name ?? session.user.email ?? 'Usuário',
    tenantName: tenant?.name ?? 'Planta Principal',
    analises: analisesFormatted
  }

  return (
    <main className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Relatórios e Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere laudos e relatórios consolidados em formato PDF.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Card do RDO */}
        <div className="rounded-xl border border-border bg-card/50 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Relatório Diário de Operação (RDO)</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Consolida todas as medições analíticas, consumo de produtos químicos e ocorrências lançadas no período de 24h. Arquivo oficial de Uso Interno.
            </p>
            
            <div className="mt-4 p-3 rounded-lg bg-background border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data Base:</span>
                <span className="font-medium text-foreground">{dateFormatter.format(targetDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Leituras:</span>
                <span className="font-medium text-foreground">{leituras.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consumo Químico:</span>
                <span className="font-medium text-foreground">{consumos.length} produtos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ocorrências:</span>
                <span className="font-medium text-foreground">{ocorrencias.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
             <RdoDownloadBtn data={pdfData} />
          </div>
        </div>

        {/* Card do Automonitoramento */}
        <div className="rounded-xl border border-border bg-card/50 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Relatório de Automonitoramento</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Consolida todas as análises laboratoriais internas e externas realizadas no mês. Documento oficial de Compliance.
            </p>
            
            <div className="mt-4 p-3 rounded-lg bg-background border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mês de Referência:</span>
                <span className="font-medium text-foreground capitalize">{monthFormatter.format(targetDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Análises Internas:</span>
                <span className="font-medium text-foreground">{rawAnalises.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Laudos Externos:</span>
                <span className="font-medium text-foreground">{rawExterna.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
             <AutomonitoramentoDownloadBtn data={automonitoramentoData} />
          </div>
        </div>
      </div>
    </main>
  )
}
