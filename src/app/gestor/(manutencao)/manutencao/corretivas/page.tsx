import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR, PRIORITY_LABEL, SEVERITY_COLOR } from '@/lib/labels'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { DataTableRow } from '@/components/ui/data-table-row'

export default async function CorrectiveMaintenancePage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const q = searchParams.q

  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.correctiveMaintenance.findMany({
    where: { 
      tenant_id,
      ...(q ? {
        OR: [
          { equipment: { name: { contains: q, mode: 'insensitive' } } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      } : {})
    },
    include: {
      equipment: true,
      responsible: { select: { name: true } },
    },
    orderBy: { start_date: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-muted text-muted-foreground border-border'
    const label = MAINTENANCE_STATUS_LABEL[status] || status

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status === 'IN_PROGRESS' && <CircleDashed className="w-3.5 h-3.5 animate-spin-slow" />}
        {(status === 'COMPLETED' || status === 'DONE' || status === 'RESOLVED') && <CheckCircle2 className="w-3.5 h-3.5" />}
        {(status === 'SCHEDULED' || status === 'CANCELLED') && <AlertCircle className="w-3.5 h-3.5" />}
        {label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string | null) => {
    const safePriority = priority || 'MEDIUM'
    const colorClass = SEVERITY_COLOR[safePriority] || 'bg-muted/10 text-muted-foreground border-border/20'
    const label = PRIORITY_LABEL[safePriority] || safePriority
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>{label}</span>
  }

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Manutenção Corretiva" 
          description="Acompanhe as manutenções corretivas em equipamentos."
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput placeholder="Buscar equipamento..." className="w-full sm:w-auto" />
          <Link 
            href="/gestor/manutencao/corretivas/novo" 
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nova Corretiva
          </Link>
        </div>
      </div>

      <DataTable 
        headers={['Descrição / Equipamento', 'Data Início', 'Prioridade', 'Status', 'Responsável']}
        isEmpty={maintenances.length === 0}
        emptyTitle="Nenhuma manutenção encontrada"
        emptyDescription="Não há corretivas registradas que correspondam aos filtros."
      >
        {maintenances.map((m) => (
          <tr key={m.id} className="hover:bg-surface-2/30 transition-colors border-b border-border/50 last:border-0">
            <td className="px-4 py-3 align-middle">
              <div className="flex flex-col max-w-sm">
                <span className="font-medium text-foreground truncate" title={m.description}>{m.description}</span>
                <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.equipment.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground">
              {m.start_date.toLocaleDateString('pt-BR')}
            </td>
            <td className="px-4 py-3 align-middle whitespace-nowrap">
              {getPriorityBadge(m.priority)}
            </td>
            <td className="px-4 py-3 align-middle whitespace-nowrap">
              {getStatusBadge(m.status)}
            </td>
            <td className="px-4 py-3 align-middle text-muted-foreground">
              {m.responsible?.name || '—'}
            </td>
            <td className="px-4 py-3 align-middle text-right">
              <Link
                href={`/gestor/manutencao/corretivas/${m.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver detalhes
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </main>
  )
}
