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

const STATUS_LABEL: Record<string, string> = {
  OPERATING: 'Operando',
  MAINTENANCE: 'Em Manutenção',
  INACTIVE: 'Inativo',
  SCRAPPED: 'Sucateado',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'text-muted-foreground',
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
  const tenantId = await getTenantId()

  const [equipment, categories, responsibles] = await Promise.all([
    prisma.equipment.findFirst({
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
    }),
    prisma.equipmentCategory.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        role: { in: ['TECHNICIAN', 'MANAGER', 'MAINTENANCE'] },
        is_active: true,
        deleted_at: null,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  if (!equipment || equipment.tenant_id !== tenantId) notFound()

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
          <BackButton href="/gestor/equipamentos" label="Equipamentos" />
          <h1 className="text-xl font-semibold truncate mt-1">{equipment.name}</h1>
        </div>

        {/* Cabeçalho do equipamento */}
        <div className={[
          'rounded-xl border bg-card p-4 space-y-3',
          isOverdue ? 'border-red-900/60' : 'border-border',
        ].join(' ')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{equipment.name}</p>
              <p className="text-sm text-muted-foreground">{equipment.category.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!equipment.is_active && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border">
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
              <dt className="text-muted-foreground">Fabricante</dt>
              <dd className="text-foreground">{equipment.manufacturer ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Modelo</dt>
              <dd className="text-foreground">{equipment.model_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nº série / Patrimônio</dt>
              <dd className="text-foreground">{equipment.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Localização</dt>
              <dd className="text-foreground">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status Operacional</dt>
              <dd className="text-foreground">{STATUS_LABEL[equipment.status] ?? equipment.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Responsável Técnico</dt>
              <dd className="text-foreground">{equipment.responsible?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Instalação</dt>
              <dd className="text-foreground">{formatDate(equipment.installation_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Freq. preventiva</dt>
              <dd className="text-foreground">{equipment.preventive_frequency_days} dias</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Próxima preventiva</dt>
              <dd className={isOverdue ? 'text-red-400 font-semibold mt-0.5' : 'text-foreground mt-0.5'}>
                {nextScheduled ? formatDate(new Date(nextScheduled.scheduled_date)) : '—'}
                {isOverdue && ' (ATRASADA)'}
              </dd>
            </div>
          </dl>

          {/* Foto e Manual */}
          {(equipment.photo_url || equipment.manual_url) && (
            <div className="flex flex-col sm:flex-row gap-4 border-t border-border pt-3">
              {equipment.photo_url && (
                <div className="w-full sm:w-1/2">
                  <span className="text-[10px] text-muted-foreground block font-bold mb-1 uppercase tracking-wider">Foto do Equipamento</span>
                  <div className="relative rounded-lg overflow-hidden border border-border bg-background/40">
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
                  <span className="text-[10px] text-muted-foreground block font-bold mb-1 uppercase tracking-wider">Documento Técnico</span>
                  <a 
                    href={`/api/equipments/${equipment.id}/files?type=manual`}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card/60 p-3 hover:bg-card hover:border-border transition-colors text-xs font-semibold text-sky-400 gap-1.5 w-full text-center"
                  >
                    📄 Visualizar Manual (PDF)
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <ToggleButton equipamentoId={equipment.id} isActive={equipment.is_active} />
          </div>
        </div>

        {/* Manutenções preventivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Preventivas</h2>
          {equipment.preventive_maintenances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma preventiva registrada.</p>
          ) : (
            <div className="space-y-2">
              {equipment.preventive_maintenances.map((p) => {
                const overdue =
                  p.status === 'SCHEDULED' && new Date(p.scheduled_date) < today
                return (
                  <div
                    key={p.id}
                    className={[
                      'rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-2',
                      overdue ? 'border-red-900/60' : 'border-border',
                    ].join(' ')}
                  >
                    <div>
                      <p className={['text-sm font-medium', overdue ? 'text-red-400' : 'text-foreground'].join(' ')}>
                        {formatDate(new Date(p.scheduled_date))}
                        {overdue && ' — vencida'}
                      </p>
                      {p.status === 'COMPLETED' && p.completed_date && (
                        <p className="text-xs text-muted-foreground">
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
                  className="rounded-lg border border-border bg-card px-4 py-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(c.start_date)} · {c.responsible.name}
                      </p>
                    </div>
                    <span className={['text-xs font-medium shrink-0', c.priority ? (PRIORITY_COLOR[c.priority] ?? 'text-muted-foreground') : 'text-muted-foreground'].join(' ')}>
                      {c.priority ? (PRIORITY_LABEL[c.priority] ?? c.priority) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {c.status === 'OPEN' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border border-border">
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
                      estimatedCost={c.estimated_cost ? Number(c.estimated_cost) : null}
                      initialNotes={c.notes}
                    />
                  </div>

                  {c.notes && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-2">{c.notes}</p>
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

        {/* Histórico de Manutenção */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Histórico de Manutenções (Logs)</h2>
          {equipment.maintenance_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum log de manutenção registrado.</p>
          ) : (
            <div className="space-y-2">
              {equipment.maintenance_logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-card/50 px-4 py-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground uppercase tracking-wide">
                      {log.type === 'PREVENTIVE' ? 'Preventiva' : log.type === 'CORRECTIVE' ? 'Corretiva' : log.type}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(log.logged_at)}
                    </span>
                  </div>
                  <p className="text-foreground text-sm mt-1">{log.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground pt-1">
                    {log.cost && (
                      <p>
                        <span className="text-muted-foreground">Custo:</span> R$ {Number(log.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Executado por:</span> {log.performed_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Editar equipamento */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Editar dados</h2>
          <div className="rounded-xl border border-border bg-card p-4">
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
                manufacturer:              equipment.manufacturer,
                model_name:                equipment.model_name,
                status:                    equipment.status,
                responsible_id:            equipment.responsible_id,
                photo_url:                 equipment.photo_url,
                manual_url:                equipment.manual_url,
              }}
              categories={categories}
              responsibles={responsibles}
            />
          </div>
        </section>
    </main>
  )
}
