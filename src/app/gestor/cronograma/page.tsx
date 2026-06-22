import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { deleteMonitoringSchedule, toggleMonitoringSchedule } from './actions'
import { Trash2, Power } from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatDays(days: number[]): string {
  if (!days || days.length === 0) return 'Todo dia'
  if (days.length === 7) return 'Todos os dias'
  return days.map(d => DIAS_SEMANA[d]).join(', ')
}

function translateRole(role: string) {
  if (role === 'OPERATOR') return 'Operador'
  if (role === 'TECHNICIAN') return 'Técnico'
  return role
}

function translateType(type: string) {
  if (type === 'FIELD') return 'Campo'
  if (type === 'INTERNAL') return 'Interna (Lab)'
  if (type === 'EXTERNAL') return 'Externa (Terceirizado)'
  return type
}

export default async function CronogramaPage() {
  const schedules = await prisma.monitoringSchedule.findMany({
    where: {
      tenant_id: (await getTenantId()),
    },
    include: {
      collection_point: { select: { name: true } },
      parameter: { select: { name: true, unit: true } }
    },
    orderBy: [
      { executor_role: 'asc' },
      { collection_point: { name: 'asc' } },
    ]
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agendamento de Análises</h1>
          <p className="text-sm text-slate-400">Gerencie a frequência de amostragens de Campo, Internas e Externas.</p>
        </div>
        <Link href="/gestor/cronograma/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo Agendamento
          </Button>
        </Link>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Nenhum agendamento cadastrado no Agendamento de Análises.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Ponto / Parâmetro</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Tipo de Análise</th>
                <th className="px-4 py-3">Periodicidade (Dias)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {schedules.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{s.collection_point.name}</div>
                    <div className="text-xs text-slate-500">{s.parameter.name} ({s.parameter.unit})</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${s.executor_role === 'OPERATOR' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {translateRole(s.executor_role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {translateType(s.sample_type)}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium">
                    {formatDays(s.days_of_week)}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <form action={toggleMonitoringSchedule}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="is_active" value={String(s.is_active)} />
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100" title={s.is_active ? 'Desativar' : 'Ativar'}>
                          <Power className="h-4 w-4" />
                        </Button>
                      </form>
                      <form action={deleteMonitoringSchedule}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-400/70 hover:bg-red-950/50 hover:text-red-400" title="Remover">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{schedules.length} agendamento(s) cadastrado(s)</p>
    </main>
  )
}
