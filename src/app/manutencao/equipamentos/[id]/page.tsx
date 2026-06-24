import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConcludeButton } from '@/app/tecnico/equipamentos/[id]/conclude-button'
import { StatusButton } from '@/app/tecnico/equipamentos/[id]/status-button'
import { getTenantId } from '@/lib/tenant'

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const STATUS_LABEL: Record<string, string> = {
  OPERATING: 'Operando',
  MAINTENANCE: 'Em Manutenção',
  INACTIVE: 'Inativo',
  SCRAPPED: 'Sucateado',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'text-slate-400',
  MEDIUM:   'text-amber-400',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-red-400',
}

export default async function ManutencaoEquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['MAINTENANCE', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  const { id } = await params
  const tenantId = await getTenantId()

  const equipment = await prisma.equipment.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      category: { select: { name: true } },
      responsible: { select: { name: true } },
      preventive_maintenances: {
        orderBy: { scheduled_date: 'desc' },
        take:    10,
        select:  { id: true, scheduled_date: true, status: true, completed_date: true },
      },
      corrective_maintenances: {
        orderBy: { start_date: 'desc' },
        take:    10,
        include: { responsible: { select: { name: true } } },
      },
      maintenance_logs: {
        orderBy: { logged_at: 'desc' },
        take: 10
      }
    },
  })

  if (!equipment) notFound()

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const nextScheduled = equipment.preventive_maintenances.find(
    (p) => p.status === 'SCHEDULED',
  ) ?? null
  const isOverdue = nextScheduled
    ? new Date(nextScheduled.scheduled_date) < today
    : false

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/manutencao/dashboard" label="Voltar" />
          <h1 className="text-xl font-semibold truncate mt-1">{equipment.name}</h1>
        </div>

        {/* Cabeçalho do equipamento */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          isOverdue ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{equipment.name}</p>
              <p className="text-sm text-slate-400">{equipment.category.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!equipment.is_active && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                  Inativo
                </span>
              )}
              {isOverdue && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                  Preventiva vencida
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <dt className="text-slate-500">Fabricante</dt>
              <dd className="text-slate-300">{equipment.manufacturer ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Modelo</dt>
              <dd className="text-slate-300">{equipment.model_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nº série / Patrimônio</dt>
              <dd className="text-slate-300">{equipment.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Localização</dt>
              <dd className="text-slate-300">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status Operacional</dt>
              <dd className="text-slate-300">{STATUS_LABEL[equipment.status] ?? equipment.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Responsável Técnico</dt>
              <dd className="text-slate-300">{equipment.responsible?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Instalação</dt>
              <dd className="text-slate-300">{formatDate(equipment.installation_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Freq. preventiva</dt>
              <dd className="text-slate-300">{equipment.preventive_frequency_days} dias</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Próxima preventiva</dt>
              <dd className={isOverdue ? 'text-red-400 font-semibold mt-0.5' : 'text-slate-300 mt-0.5'}>
                {nextScheduled ? formatDate(new Date(nextScheduled.scheduled_date)) : '—'}
                {isOverdue && ' (ATRASADA)'}
              </dd>
            </div>
          </dl>

          {/* Foto e Manual */}
          {(equipment.photo_url || equipment.manual_url) && (
            <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-800 pt-3">
              {equipment.photo_url && (
                <div className="w-full sm:w-1/2">
                  <span className="text-[10px] text-slate-500 block font-bold mb-1 uppercase tracking-wider">Foto do Equipamento</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950/40">
                    <img 
                      src={`/api/equipments/${equipment.id}/files?type=photo`} 
                      alt={equipment.name} 
                      className="w-full h-auto object-cover max-h-48"
                    />
                  </div>
                </div>
              )}
              {equipment.manual_url && (
                <div className="w-full sm:w-1/2 flex flex-col justify-end">
                  <span className="text-[10px] text-slate-500 block font-bold mb-1 uppercase tracking-wider">Documento Técnico</span>
                  <a 
                    href={`/api/equipments/${equipment.id}/files?type=manual`}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:bg-slate-850 hover:border-slate-700 transition-colors text-xs font-semibold text-sky-400 gap-1.5 w-full text-center"
                  >
                    📄 Visualizar Manual (PDF)
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manutenções preventivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Preventivas</h2>
          {equipment.preventive_maintenances.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma preventiva registrada.</p>
          ) : (
            <div className="space-y-2">
              {equipment.preventive_maintenances.map((p) => {
                const overdue =
                  p.status === 'SCHEDULED' && new Date(p.scheduled_date) < today
                return (
                  <div
                    key={p.id}
                    className={[
                      'rounded-lg border bg-slate-900 px-4 py-3 flex items-center justify-between gap-2',
                      overdue ? 'border-red-900/60' : 'border-slate-800',
                    ].join(' ')}
                  >
                    <div>
                      <p className={['text-sm font-medium', overdue ? 'text-red-400' : 'text-slate-200'].join(' ')}>
                        {formatDate(new Date(p.scheduled_date))}
                        {overdue && ' — vencida'}
                      </p>
                      {p.status === 'COMPLETED' && p.completed_date && (
                        <p className="text-xs text-slate-500">
                          Concluída em {formatDate(new Date(p.completed_date))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === 'COMPLETED' ? (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                          Concluída
                        </span>
                      ) : (
                        <ConcludeButton preventivaId={p.id} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Manutenções corretivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Corretivas</h2>

          {equipment.corrective_maintenances.length > 0 && (
            <div className="space-y-2">
              {equipment.corrective_maintenances.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-snug">{c.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(c.start_date)} · {c.responsible.name}
                      </p>
                    </div>
                    <span className={['text-xs font-medium shrink-0', c.priority ? (PRIORITY_COLOR[c.priority] ?? 'text-slate-400') : 'text-slate-400'].join(' ')}>
                      {c.priority ? (PRIORITY_LABEL[c.priority] ?? c.priority) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {c.status === 'OPEN' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Aberta
                      </span>
                    ) : c.status === 'IN_PROGRESS' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Em andamento
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Concluída
                      </span>
                    ) : c.status === 'VALIDATED' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-purple-950/60 text-purple-400 border border-purple-900/50">
                        Validada (Fechada)
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                        Cancelada
                      </span>
                    )}

                    <StatusButton
                      corretivaId={c.id}
                      currentStatus={c.status as any}
                      userRole={session.user.role}
                      estimatedCost={c.estimated_cost}
                      initialNotes={c.notes}
                    />
                  </div>

                  {c.notes && (
                    <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">{c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Histórico de Manutenção */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Histórico de Manutenções (Logs)</h2>
          {equipment.maintenance_logs.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum log de manutenção registrado.</p>
          ) : (
            <div className="space-y-2">
              {equipment.maintenance_logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 uppercase tracking-wide">
                      {log.type === 'PREVENTIVE' ? 'Preventiva' : log.type === 'CORRECTIVE' ? 'Corretiva' : log.type}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(log.logged_at)}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">{log.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 pt-1">
                    {log.cost && (
                      <p>
                        <span className="text-slate-500">Custo:</span> R$ {Number(log.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">Executado por:</span> {log.performed_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
    </main>
  )
}
