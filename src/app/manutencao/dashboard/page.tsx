import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Wrench, AlertTriangle, Calendar, Settings } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { formatDateDisplay } from '@/lib/date-utils'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard de Manutenção | Solentis',
}

export default async function ManutencaoDashboardPage() {
  const tenant_id = await getTenantId()
  
  const [preventivas, corretivas] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      where: { tenant_id, status: { not: 'COMPLETED' } },
      include: { equipment: true },
      orderBy: { scheduled_date: 'asc' },
      take: 10
    }),
    prisma.correctiveMaintenance.findMany({
      where: { tenant_id, status: { not: 'COMPLETED' } },
      include: { equipment: true },
      orderBy: { start_date: 'asc' },
      take: 10
    })
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Dashboard de Manutenção" 
        description="Visão geral de manutenções preventivas e corretivas pendentes."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventivas Pendentes</CardTitle>
            <Wrench className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preventivas.length}</div>
            <p className="text-xs text-slate-400">Atividades preventivas programadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corretivas Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{corretivas.length}</div>
            <p className="text-xs text-slate-400">Ordens de serviço em andamento</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fila de Preventivas */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" /> Preventivas Próximas
          </h2>
          {preventivas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Nenhuma preventiva programada.
            </div>
          ) : (
            <div className="space-y-2">
              {preventivas.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <div>
                    <Link href={`/manutencao/equipamentos/${p.equipment_id}`} className="font-medium text-sm text-blue-400 hover:underline">
                      {p.equipment.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">Agendada: {formatDateDisplay(p.scheduled_date)}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-slate-800 text-slate-300 rounded">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fila de Corretivas */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" /> Corretivas Pendentes
          </h2>
          {corretivas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Nenhuma corretiva aberta.
            </div>
          ) : (
            <div className="space-y-2">
              {corretivas.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/manutencao/equipamentos/${c.equipment_id}`} className="font-medium text-sm text-blue-400 hover:underline">
                        {c.equipment.name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      c.priority === 'HIGH' ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {c.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
