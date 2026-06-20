import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CheckCircle2, AlertCircle, Wrench, CircleDashed } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR, PRIORITY_LABEL, SEVERITY_COLOR } from '@/lib/labels'

export default async function CorrectiveMaintenancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.correctiveMaintenance.findMany({
    where: { tenant_id },
    include: {
      equipment: true,
      responsible: { select: { name: true } },
    },
    orderBy: { start_date: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-slate-800 text-slate-400 border-slate-700'
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
    const colorClass = SEVERITY_COLOR[safePriority] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
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
        <Link 
          href="/gestor/manutencao/corretivas/nova" 
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Corretiva
        </Link>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Descrição / Equipamento</th>
                <th className="px-6 py-4">Data Início</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nenhuma manutenção corretiva cadastrada.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-sm">
                        <span className="font-medium text-foreground truncate" title={m.description}>{m.description}</span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.equipment.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {m.start_date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(m.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(m.status)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {m.responsible?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/gestor/manutencao/corretivas/${m.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-xs transition-colors"
                      >
                        Detalhes
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
