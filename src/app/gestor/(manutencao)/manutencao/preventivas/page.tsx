import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR } from '@/lib/labels'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'

export default async function PreventiveMaintenancePage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const q = searchParams.q

  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.preventiveMaintenance.findMany({
    where: { 
      tenant_id,
      ...(q ? {
        OR: [
          { equipment: { name: { contains: q, mode: 'insensitive' } } },
          { notes: { contains: q, mode: 'insensitive' } }
        ]
      } : {})
    },
    include: {
      equipment: true,
      completer: { select: { name: true } },
    },
    orderBy: { scheduled_date: 'asc' },
  })

  const getStatusBadge = (status: string, date: Date) => {
    const isPast = date < new Date() && status !== 'COMPLETED' && status !== 'DONE'

    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Atrasada
        </span>
      )
    }

    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-muted text-muted-foreground border-border'
    const label = MAINTENANCE_STATUS_LABEL[status] || status

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status === 'DONE' || status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
        {label}
      </span>
    )
  }

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Manutenção Preventiva" 
          description="Acompanhe as manutenções agendadas e histórico de execuções."
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput placeholder="Buscar equipamento..." className="w-full sm:w-auto" />
          <div className="flex gap-2">
            <Link 
              href="/api/export?type=preventives" target="_blank"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-surface-2 text-foreground text-sm font-medium rounded-lg hover:bg-surface-2/80 transition-all shadow-sm border border-border"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Link>
            <Link 
              href="/gestor/manutencao/preventivas/novo" 
              className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nova
            </Link>
          </div>
        </div>
      </div>

      <DataTable 
        headers={['Equipamento', 'Data Agendada', 'Status', 'Responsável']}
        isEmpty={maintenances.length === 0}
        emptyTitle="Nenhuma manutenção encontrada"
        emptyDescription="Não há preventivas agendadas que correspondam aos filtros."
      >
        {maintenances.map((m) => (
          <tr key={m.id} className="hover:bg-surface-2/30 transition-colors border-b border-border/50 last:border-0">
            <td className="px-4 py-3 align-middle">
              <div className="flex flex-col max-w-sm">
                <span className="font-medium text-foreground truncate" title={m.equipment.name}>{m.equipment.name}</span>
                {m.notes && <span className="text-[11px] text-muted-foreground truncate">{m.notes}</span>}
              </div>
            </td>
            <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground">
              {m.scheduled_date.toLocaleDateString('pt-BR')}
            </td>
            <td className="px-4 py-3 align-middle whitespace-nowrap">
              {getStatusBadge(m.status, m.scheduled_date)}
            </td>
            <td className="px-4 py-3 align-middle text-muted-foreground">
              {m.completer?.name || '—'}
            </td>
            <td className="px-4 py-3 align-middle text-right">
              <Link
                href={`/gestor/manutencao/preventivas/${m.id}`}
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
