'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function deleteMonitoringSchedule(formData: FormData) {
  const ctx = await requirePermission('config.manage')
  const tenant_id = await getTenantId()
  const schedule_id = formData.get('id') as string

  if (!schedule_id) return

  // deleteMany (não delete) para não lançar quando o id não é desta planta
  const { count } = await prisma.monitoringSchedule.deleteMany({
    where: {
      id: schedule_id,
      tenant_id: tenant_id, // ensure they can only delete their own
    }
  })
  if (count === 0) return

  await logAudit(prisma, {
    tenantId: tenant_id, userId: ctx.userId, action: 'DELETE',
    tableName: 'monitoring_schedules', recordId: schedule_id,
  })

  revalidatePath('/gestor/cronograma')
}

export async function toggleMonitoringSchedule(formData: FormData) {
  const ctx = await requirePermission('config.manage')
  const tenant_id = await getTenantId()
  const schedule_id = formData.get('id') as string
  const current_status = formData.get('is_active') === 'true'

  if (!schedule_id) return

  const { count } = await prisma.monitoringSchedule.updateMany({
    where: {
      id: schedule_id,
      tenant_id: tenant_id,
    },
    data: {
      is_active: !current_status
    }
  })
  if (count === 0) return

  await logAudit(prisma, {
    tenantId: tenant_id, userId: ctx.userId, action: 'UPDATE',
    tableName: 'monitoring_schedules', recordId: schedule_id,
    before: { is_active: current_status }, after: { is_active: !current_status },
  })

  revalidatePath('/gestor/cronograma')
}
