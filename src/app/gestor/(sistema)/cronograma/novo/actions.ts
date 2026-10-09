'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { assertOwned, OwnershipError } from '@/lib/ownership'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { executorFor, parseMonitoringScheduleForm, primeiraMensagem } from '@/lib/monitoring-schedule'

/** Volta ao formulário com a mensagem (o formulário é um <form action> simples). */
function voltarComErro(msg: string): never {
  redirect(`/gestor/cronograma/novo?erro=${encodeURIComponent(msg)}`)
}

export async function createMonitoringSchedule(formData: FormData) {
  const ctx = await requirePermission('config.manage')
  const tenant_id = await getTenantId()

  // T-18 (B-07): tipo, frequência e dias validados; nada de texto livre ou NaN
  const parsed = parseMonitoringScheduleForm(formData)
  if (!parsed.success) voltarComErro(primeiraMensagem(parsed.error))
  const d = parsed.data

  // Ponto e parâmetro vêm do formulário: precisam ser desta planta (T-05)
  try {
    await assertOwned(tenant_id, [
      { model: 'collectionPoint', id: d.collection_point_id },
      { model: 'qualityParameter', id: d.parameter_id },
    ])
  } catch (e) {
    if (e instanceof OwnershipError) voltarComErro('Ponto de coleta ou parâmetro não encontrado.')
    throw e
  }

  // Autor = usuário logado (antes era o primeiro usuário qualquer da planta)
  const created_by = ctx.userId

  await prisma.monitoringSchedule.create({
    data: {
      tenant_id,
      collection_point_id: d.collection_point_id,
      parameter_id: d.parameter_id,
      executor_role: executorFor(d.sample_type),
      sample_type: d.sample_type,
      frequency: d.frequency,
      days_of_week: d.days_of_week,
      // dias do mês só fazem sentido na frequência mensal
      days_of_month: d.frequency === 'MONTHLY' ? d.days_of_month : [],
      created_by,
      is_active: true,
    },
  })

  revalidatePath('/gestor/cronograma')
  redirect('/gestor/cronograma')
}
