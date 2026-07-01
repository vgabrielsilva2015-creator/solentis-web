'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { getLogger } from '@/lib/logger'

export type NotificationItem = {
  id: string
  title: string
  description: string
  type: 'TASK' | 'OCCURRENCE' | 'MAINTENANCE'
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

    // 1. Ocorrências Abertas (Para todos)
    const occurrences = await prisma.occurrence.findMany({
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
        href: session.user.role === 'OPERATOR' 
          ? `/operador/ocorrencias/${occ.id}` 
          : session.user.role === 'TECHNICIAN'
          ? `/tecnico/ocorrencias/${occ.id}`
          : `/gestor/ocorrencias/${occ.id}`,
        date: occ.created_at,
      })
    })

    // 2. Tarefas Pendentes do Turno Atual
    const activeShiftInstance = await prisma.shiftInstance.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'OPEN',
      },
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
          href: session.user.role === 'OPERATOR'
            ? `/operador/turnos/${activeShiftInstance.id}/tarefas`
            : `/tecnico/turnos/tarefas`,
          date: task.created_at,
        })
      })
    }

    // 3. Manutenções Preventivas (Apenas Técnico/Gestor)
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'MANAGER') {
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
          href: session.user.role === 'TECHNICIAN'
            ? `/tecnico/equipamentos/${maint.equipment_id}`
            : `/gestor/equipamentos/${maint.equipment_id}`,
          date: maint.scheduled_date,
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
