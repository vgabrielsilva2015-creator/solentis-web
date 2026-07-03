import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { deleteMonitoringSchedule, toggleMonitoringSchedule } from './actions'
import { Trash2, Power } from 'lucide-react'

export const revalidate = 60

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PAGE_SIZE = 25

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

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const tenantId = await getTenantId()
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where = { tenant_id: tenantId }

  const [schedules, total] = await Promise.all([
    prisma.monitoringSchedule.findMany({
      where,
      include: {
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } }
      },
      orderBy: [
        { executor_role: 'asc' },
        { collection_point: { name: 'asc' } },
      ],
      take: PAGE_SIZE,
      skip,
    }),
    prisma.monitoringSchedule.count({ where })
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Agendamento de Análises</h1>
          <p className="text-sm text-muted-foreground">Gerencie a frequência de amostragens de Campo, Internas e Externas.</p>
        </div>
        <Link href="/gestor/cronograma/novo">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
            + Novo Agendamento
          </Button>
        </Link>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum agendamento cadastrado no Agendamento de Análises.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Ponto / Parâmetro</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Tipo de Análise</th>
                <th className="px-4 py-3">Periodicidade (Dias)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{s.collection_point.name}</div>
                    <div className="text-xs text-muted-foreground">{s.parameter.name} ({s.parameter.unit})</div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${s.executor_role === 'OPERATOR' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {translateRole(s.executor_role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {translateType(s.sample_type)}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">
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
                        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title={s.is_active ? 'Desativar' : 'Ativar'}>
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

      {/* Paginação */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">Total: {total} agendamento(s) · Página {page} de {totalPages || 1}</p>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/gestor/cronograma?page=${page - 1}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="text-muted-foreground">← Anterior</span>
            )}
            {page < totalPages ? (
              <Link
                href={`/gestor/cronograma?page=${page + 1}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Próxima →
              </Link>
            ) : (
              <span className="text-muted-foreground">Próxima →</span>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
