import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, CheckCircle2, AlertCircle, Wrench, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR } from '@/lib/labels'

export default async function PreventiveMaintenancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.preventiveMaintenance.findMany({
    where: { tenant_id },
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

    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-slate-800 text-slate-400 border-slate-700'
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
        <div className="flex gap-2">
          <Link 
            href="/api/export?type=preventives" target="_blank"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-surface-2 text-foreground text-sm font-medium rounded-lg hover:bg-surface-2/80 transition-all shadow-sm border border-border"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Link>
          <Link 
            href="/gestor/manutencao/preventivas/nova" 
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Preventiva
          </Link>
        </div>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Data Agendada</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nenhuma manutenção preventiva cadastrada.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{m.equipment.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.equipment.serial_number ? `SN: ${m.equipment.serial_number}` : 'Sem SN'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {m.scheduled_date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(m.status, m.scheduled_date)}
                    </td>
                    <td className="px-6 py-4">
                      {m.completer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/gestor/equipamentos/${m.equipment_id}`}
                        className="text-primary hover:text-primary/80 font-medium text-xs transition-colors"
                      >
                        Abrir equipamento
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
