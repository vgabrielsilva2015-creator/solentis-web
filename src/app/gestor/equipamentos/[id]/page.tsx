import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConcludeButton } from './conclude-button'
import { StatusButton } from './status-button'
import { CorrectiveForm } from './corrective-form'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'
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

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'text-slate-400',
  MEDIUM:   'text-amber-400',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-red-400',
}

export default async function EquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  const { id } = await params

  const equipment = await prisma.equipment.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      category: { select: { name: true } },
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
    },
  })

  if (!equipment || equipment.tenant_id !== (await getTenantId())) notFound()

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const nextScheduled = equipment.preventive_maintenances.find(
    (p) => p.status === 'SCHEDULED',
  ) ?? null
  const isOverdue = nextScheduled
    ? new Date(nextScheduled.scheduled_date) < today
    : false

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/gestor/equipamentos" label="Equipamentos" />
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

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt className="text-slate-500">Nº série</dt>
              <dd className="text-slate-300">{equipment.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Localização</dt>
              <dd className="text-slate-300">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Instalação</dt>
              <dd className="text-slate-300">{formatDate(equipment.installation_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Freq. preventiva</dt>
              <dd className="text-slate-300">{equipment.preventive_frequency_days} dias</dd>
            </div>
            <div>
              <dt className="text-slate-500">Próxima preventiva</dt>
              <dd className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {nextScheduled ? formatDate(new Date(nextScheduled.scheduled_date)) : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex justify-end">
            <ToggleButton equipamentoId={equipment.id} isActive={equipment.is_active} />
          </div>
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
                    {c.status === 'IN_PROGRESS' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Em andamento
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Concluída
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                        Cancelada
                      </span>
                    )}

                    {c.status === 'IN_PROGRESS' && (
                      <div className="flex gap-2">
                        <StatusButton corretivaId={c.id} action="COMPLETED" />
                        <StatusButton corretivaId={c.id} action="CANCELLED" />
                      </div>
                    )}
                  </div>

                  {c.notes && (
                    <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">{c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulário de nova corretiva — só se equipamento ativo */}
          {equipment.is_active && (
            <CorrectiveForm equipamentoId={equipment.id} />
          )}
        </section>

        {/* Editar equipamento */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Editar dados</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <EditForm
              equipment={{
                id:                        equipment.id,
                name:                      equipment.name,
                category_id:               equipment.category_id,
                serial_number:             equipment.serial_number,
                location:                  equipment.location,
                installation_date:         equipment.installation_date,
                preventive_frequency_days: equipment.preventive_frequency_days,
                is_active:                 equipment.is_active,
              }}
              categories={categories}
            />
          </div>
        </section>
    </main>
  )
}
