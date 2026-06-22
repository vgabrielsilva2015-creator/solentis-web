'use server'

import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

export async function deleteMonitoringSchedule(formData: FormData) {
  const tenant_id = await getTenantId()
  const schedule_id = formData.get('id') as string

  if (!schedule_id) return

  await prisma.monitoringSchedule.delete({
    where: {
      id: schedule_id,
      tenant_id: tenant_id, // ensure they can only delete their own
    }
  })

  revalidatePath('/gestor/cronograma')
}

export async function toggleMonitoringSchedule(formData: FormData) {
  const tenant_id = await getTenantId()
  const schedule_id = formData.get('id') as string
  const current_status = formData.get('is_active') === 'true'

  if (!schedule_id) return

  await prisma.monitoringSchedule.update({
    where: {
      id: schedule_id,
      tenant_id: tenant_id,
    },
    data: {
      is_active: !current_status
    }
  })

  revalidatePath('/gestor/cronograma')
}
