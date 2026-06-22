'use server'

import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMonitoringSchedule(formData: FormData) {
  const tenant_id = await getTenantId()
  const collection_point_id = formData.get('collection_point_id') as string
  const parameter_id = formData.get('parameter_id') as string
  const sample_type = formData.get('sample_type') as string
  
  let executor_role = 'TECHNICIAN'
  if (sample_type === 'FIELD') {
    executor_role = 'OPERATOR'
  }

  const frequency = formData.get('frequency') as string // PER_SHIFT, DAILY, WEEKLY, MONTHLY
  const days_of_week = formData.getAll('days_of_week').map(Number)
  const days_of_month = formData.getAll('days_of_month').map(Number)
  
  // TODO: Em uma implementação completa, pegariamos o usuário logado
  const created_by = await prisma.user.findFirst({ where: { tenant_id } }).then(u => u?.id || '')

  await prisma.monitoringSchedule.create({
    data: {
      tenant_id,
      collection_point_id,
      parameter_id,
      executor_role,
      sample_type,
      frequency,
      days_of_week,
      days_of_month,
      created_by,
      is_active: true
    }
  })

  revalidatePath('/gestor/cronograma')
  redirect('/gestor/cronograma')
}
