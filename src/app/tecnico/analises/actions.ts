'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { localInputToUTC } from '@/lib/date-utils'
import { redirect } from 'next/navigation'
import { sendPushToRole } from '@/lib/push-actions'


async function requireTechnician() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') {
    redirect('/login')
  }
  return session
}

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

const AnaliseSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id:        z.string().min(1, 'Selecione o parâmetro'),
  value: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe o valor medido' }),
  ),
  report_text: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(5000, 'Laudo deve ter no máximo 5000 caracteres').nullable(),
  ),
  laboratory_type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  collected_at: z.string().min(1, 'Informe a data/hora da coleta'),
})

export type AnaliseFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar análise ────────────────────────────────────────────────────────

export async function registrarAnalise(
  _prev: AnaliseFormState,
  formData: FormData,
): Promise<AnaliseFormState> {
  const session = await requireTechnician()

  const parsed = AnaliseSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    report_text:         formData.get('report_text'),
    laboratory_type:     formData.get('laboratory_type'),
    collected_at:        formData.get('collected_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const param = await prisma.qualityParameter.findFirst({ where: { id: parsed.data.parameter_id , tenant_id: (await getTenantId()) },
    select: { name: true, min_limit: true, max_limit: true, unit: true, default_method_id: true },
  })
  if (!param) return { error: 'Parâmetro não encontrado.' }

  const isNonConformant =
    calcularNaoConformidade(parsed.data.value, param.min_limit, param.max_limit) ?? false

  const tenantId = await getTenantId()

  await prisma.$transaction(async (tx) => {
    await tx.analysis.create({
      data: {
        tenant_id:           tenantId,
        collection_point_id: parsed.data.collection_point_id,
        parameter_id:        parsed.data.parameter_id,
        method_id:           param.default_method_id,
        value:               parsed.data.value,
        unit:                param.unit,
        min_limit_applied:   param.min_limit,   // snapshot imutável
        max_limit_applied:   param.max_limit,   // snapshot imutável
        report_text:         parsed.data.report_text,
        laboratory_type:     parsed.data.laboratory_type,
        is_non_conformant:   isNonConformant,
        approved_by:         null,
        approved_at:         null,
        origin:              'MANUAL',
        collected_at:        localInputToUTC(parsed.data.collected_at),
        recorded_by:         userId,
      },
    })

    if (isNonConformant) {
      const point = await tx.collectionPoint.findFirst({
        where: { id: parsed.data.collection_point_id, tenant_id: tenantId },
        select: { name: true }
      })
      const paramName = await tx.qualityParameter.findFirst({
        where: { id: parsed.data.parameter_id, tenant_id: tenantId },
        select: { name: true }
      })

      const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
        where: { tenant_id_severity: { tenant_id: tenantId, severity: 'HIGH' } }
      })
      const deadlineHours = defaultSeverity?.deadline_hours || 24
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + deadlineHours)

      await tx.occurrence.create({
        data: {
          tenant_id:   tenantId,
          description: `Não Conformidade (${paramName?.name}): Análise registrada = ${parsed.data.value} ${param.unit}. O valor está fora dos limites aceitáveis. Ponto de Coleta: ${point?.name || parsed.data.collection_point_id}`,
          severity:    'HIGH',
          status:      'OPEN',
          type:        'LABORATORY',
          deadline,
          reported_by: userId,
        }
      })
    }
  })

  // Enviar notificações push
  try {
    const tenantId = await getTenantId()
    const payload = {
      title: isNonConformant ? '⚠️ Análise fora do limite' : 'Nova análise registrada',
      body: `${param.name}: ${parsed.data.value} ${param.unit ?? ''}${isNonConformant ? ' — fora do limite CONAMA' : ''}`,
      url: '/gestor/analises'
    }
    await sendPushToRole(tenantId, 'MANAGER', payload)
    await sendPushToRole(tenantId, 'OPERATOR', { ...payload, url: '/operador/dashboard' })
  } catch (err) {
    console.error('Falha ao enviar push', err)
  }

  revalidatePath('/tecnico/analises')
  return { success: true }
}

// ─── Aprovar análise ──────────────────────────────────────────────────────────
// Qualquer TECHNICIAN ou MANAGER pode aprovar qualquer análise pendente.

export async function aprovarAnalise(
  analysisId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const analysis = await prisma.analysis.findFirst({ where: { id: analysisId , tenant_id: (await getTenantId()) },
    select: { approved_by: true },
  })
  if (!analysis)              return { error: 'Análise não encontrada.' }
  if (analysis.approved_by)   return { error: 'Análise já aprovada.' }

  await prisma.analysis.updateMany({ where: { id: analysisId , tenant_id: (await getTenantId()) }, data:  { approved_by: userId, approved_at: new Date() },
  })

  revalidatePath('/tecnico/analises')
  return {}
}
