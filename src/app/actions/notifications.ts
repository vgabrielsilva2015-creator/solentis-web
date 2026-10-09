'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { getLogger } from '@/lib/logger'
import { hrefFor } from '@/lib/search'
import { notificationTaskHref, HANDOVER_ALERT_HREF } from '@/lib/notification-links'
import { STATUS_AGUARDANDO } from '@/lib/handover-status'

export type NotificationItem = {
  id: string
  title: string
  description: string
  type: 'TASK' | 'OCCURRENCE' | 'MAINTENANCE' | 'HANDOVER'
  href: string
  date: Date
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = await auth()
  if (!session) return []

  const tenantId = await getTenantId()
  const notifications: NotificationItem[] = []

  try {
    const user = await prisma.user.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    })

    if (!user) return []

    const role = session.user.role

    // 1. Ocorrências abertas — só para quem tem tela de ocorrência (T-18 / B-08:
    // o link é o mesmo da busca, nunca uma tela que o perfil não acessa)
    const occurrences = !hrefFor(role, 'occurrence', 'x') ? [] : await prisma.occurrence.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    })

    occurrences.forEach((occ) => {
      notifications.push({
        id: `occ-${occ.id}`,
        title: `Ocorrência ${occ.severity === 'CRITICAL' ? 'Crítica' : occ.severity === 'HIGH' ? 'Alta' : occ.severity === 'MEDIUM' ? 'Média' : 'Baixa'}`,
        description: occ.description,
        type: 'OCCURRENCE',
        href: hrefFor(role, 'occurrence', occ.id)!,
        date: occ.created_at,
      })
    })

    // 2. Tarefas Pendentes do Turno Atual
    const activeShiftInstance = await prisma.shiftInstance.findFirst({
      where: {
        tenant_id: tenantId,
        opened_by: user.id,
        status: 'OPEN',
      },
      orderBy: { opened_at: 'desc' },
      select: { id: true },
    })

    if (activeShiftInstance) {
      const tasks = await prisma.shiftTask.findMany({
        where: {
          tenant_id: tenantId,
          shift_instance_id: activeShiftInstance.id,
          status: 'PENDING',
        },
        take: 5,
      })

      tasks.forEach((task) => {
        notifications.push({
          id: `task-${task.id}`,
          title: 'Tarefa Pendente',
          description: task.title,
          type: 'TASK',
          href: notificationTaskHref(role, activeShiftInstance.id),
          date: task.created_at,
        })
      })
    }

    // 3. Manutenções preventivas — perfis com tela de equipamento
    if (hrefFor(role, 'equipment', 'x')) {
      const maintenances = await prisma.preventiveMaintenance.findMany({
        where: {
          tenant_id: tenantId,
          status: 'SCHEDULED',
          scheduled_date: {
            lte: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 dias
          }
        },
        include: { equipment: true },
        take: 5,
      })

      maintenances.forEach((maint) => {
        notifications.push({
          id: `maint-${maint.id}`,
          title: 'Preventiva Agendada',
          description: maint.equipment.name,
          type: 'MAINTENANCE',
          href: hrefFor(role, 'equipment', maint.equipment_id)!,
          date: maint.scheduled_date,
        })
      })
    }

    // 4. Passagens de turno sem confirmação no prazo — alerta ao gestor
    // (briefing, seção E). Calculado aqui; nada é gravado ao ler.
    if (role === 'MANAGER') {
      const vencidas = await prisma.shiftHandover.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: [...STATUS_AGUARDANDO] },
          timeout_at: { lt: new Date() },
        },
        include: {
          shift_instance: { select: { id: true, shift: { select: { name: true } } } },
          outgoing_user: { select: { name: true } },
        },
        orderBy: { timeout_at: 'desc' },
        take: 5,
      })
      vencidas.forEach((h) => {
        notifications.push({
          id: `handover-${h.id}`,
          title: 'Passagem sem confirmação',
          description: `${h.shift_instance.shift.name} · sainte: ${h.outgoing_user.name}`,
          type: 'HANDOVER',
          href: HANDOVER_ALERT_HREF(h.shift_instance.id),
          date: h.timeout_at,
        })
      })
    }

    // Ordenar por data (mais recentes primeiro)
    notifications.sort((a, b) => b.date.getTime() - a.date.getTime())

    return notifications.slice(0, 10) // Retornar no máximo 10
  } catch (err) {
    const log = await getLogger({ tenantId, action: 'getNotifications' })
    log.error({ err, role: session.user.role }, 'Falha ao buscar notificações')
    return []
  }
}
