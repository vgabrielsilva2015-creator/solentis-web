'use server'

import { prisma } from '@/lib/prisma'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { assertOwned, OwnershipError } from '@/lib/ownership'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMonitoringSchedule(formData: FormData) {
  const session = await requireRole(['MANAGER'])
  const tenant_id = await getTenantId()
  const collection_point_id = String(formData.get('collection_point_id') ?? '')
  const parameter_id = String(formData.get('parameter_id') ?? '')

  // Ponto e parâmetro vêm do formulário: precisam ser desta planta (T-05)
  await assertOwned(tenant_id, [
    { model: 'collectionPoint', id: collection_point_id },
    { model: 'qualityParameter', id: parameter_id },
  ])
  const sample_type = formData.get('sample_type') as string
  
  let executor_role = 'TECHNICIAN'
  if (sample_type === 'FIELD') {
    executor_role = 'OPERATOR'
  }

  const frequency = formData.get('frequency') as string // PER_SHIFT, DAILY, WEEKLY, MONTHLY
  const days_of_week = formData.getAll('days_of_week').map(Number)
  const days_of_month = formData.getAll('days_of_month').map(Number)
  
  // Autor = usuário logado (antes era o primeiro usuário qualquer da planta)
  const created_by = await resolveUserId(session.user.email!)
  if (!created_by) throw new OwnershipError('Sessão inválida.')

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
