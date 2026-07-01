import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { getTenantId } from '@/lib/tenant'
import { TemplateManager } from './template-manager'


export default async function TemplatesDoTurnoPage({
  params,
}: {
  params: Promise<{ shiftId: string }>
}) {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) redirect('/acesso-negado')

  const { shiftId } = await params
  const tenantId = await getTenantId()

  const [shift, templates, operators] = await Promise.all([
    prisma.shift.findFirst({
      where:  { id: shiftId, tenant_id: tenantId },
      select: { id: true, name: true, start_time: true, end_time: true },
    }),
    prisma.shiftTaskTemplate.findMany({
      where:   { tenant_id: tenantId, shift_id: shiftId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { assignee: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where:   { tenant_id: tenantId, is_active: true, role: 'OPERATOR' },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!shift) notFound()

  return (
    <div className="max-w-2xl space-y-4">
      <BackButton href="/gestor/turnos/escala" label="Escala de turnos" />
      <div>
        <h1 className="text-xl font-semibold">Análises/tarefas padrão — {shift.name}</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {shift.start_time} – {shift.end_time} · essas tarefas são criadas automaticamente a cada abertura deste turno.
        </p>
      </div>

      <TemplateManager
        shiftId={shift.id}
        operators={operators}
        templates={templates.map((t) => ({
          id:             t.id,
          title:          t.title,
          description:    t.description,
          requires_photo: t.requires_photo,
          assigned_to_id: t.assigned_to_id,
          sort_order:     t.sort_order,
          assigneeName:   t.assignee?.name ?? null,
        }))}
      />
    </div>
  )
}
