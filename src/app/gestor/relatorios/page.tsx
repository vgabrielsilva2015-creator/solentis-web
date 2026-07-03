import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { RdoDownloadBtn } from './rdo-download-btn'

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

  const [rawLeituras, rawExits, rawOcorrencias, tenant] = await Promise.all([
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
      orderBy: { recorded_at: 'asc' }
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
      orderBy: { used_at: 'asc' }
    }),
    // Ocorrências
    prisma.occurrence.findMany({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { created_at: 'asc' }
    }),
    // Dados da Planta
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true }
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

        {/* Placeholder futuro */}
        <div className="rounded-xl border border-border border-dashed bg-card/20 p-6 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted-foreground">Mais relatórios em breve</p>
          <p className="text-xs text-muted-foreground mt-1">Laudos do CONAMA e Relatórios Mensais estarão disponíveis aqui.</p>
        </div>
      </div>
    </main>
  )
}
