'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { localInputToUTC } from '@/lib/date-utils'
import { redirect } from 'next/navigation'


async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

const LeituraSchema = z
  .object({
    collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
    parameter_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    value: z.preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().nullable(),
    ),
    unit: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    notes: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres').nullable(),
    ),
    recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
  })
  .refine((d) => d.parameter_id === null || d.value !== null, {
    message: 'Informe o valor medido',
    path: ['value'],
  })

export type LeituraFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar leitura ────────────────────────────────────────────────────────

export async function registrarLeitura(
  _prev: LeituraFormState,
  formData: FormData,
): Promise<LeituraFormState> {
  const session = await requireOperator()

  const parsed = LeituraSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    unit:                formData.get('unit'),
    notes:               formData.get('notes'),
    recorded_at:         formData.get('recorded_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  let isNonConformant: boolean | null = null
  let unit = parsed.data.unit

  if (parsed.data.parameter_id) {
    const [param, collectionPoint] = await Promise.all([
      prisma.qualityParameter.findFirst({
        where:  { id: parsed.data.parameter_id, tenant_id: await getTenantId() },
        select: { min_limit: true, max_limit: true, unit: true },
      }),
      prisma.collectionPoint.findFirst({
        where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
        select: { id: true },
      })
    ])

    if (!collectionPoint) {
      return { error: 'Ponto de coleta inválido ou não autorizado.' }
    }

    if (param) {
      // Copia a unidade do parâmetro quando o formulário não enviou uma
      unit = unit ?? param.unit
      isNonConformant = calcularNaoConformidade(
        parsed.data.value,
        param.min_limit,
        param.max_limit,
      )
    } else {
      return { error: 'Parâmetro inválido ou não autorizado.' }
    }
  } else {
    // If no parameter is provided, we still need to validate the collection point
    const collectionPoint = await prisma.collectionPoint.findFirst({
      where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
      select: { id: true },
    })
    if (!collectionPoint) return { error: 'Ponto de coleta inválido ou não autorizado.' }
  }

  await prisma.$transaction(async (tx) => {
    const reading = await tx.reading.create({
      data: {
        tenant_id:           (await getTenantId()),
        collection_point_id: parsed.data.collection_point_id,
        parameter_id:        parsed.data.parameter_id,
        shift_instance_id:   null, // associado ao turno na Fase 9
        value:               parsed.data.value,
        unit,
        notes:               parsed.data.notes,
        is_non_conformant:   isNonConformant,
        origin:              'MANUAL',
        metadata_origin:     null,
        recorded_by:         userId,
        recorded_at:         localInputToUTC(parsed.data.recorded_at),
      },
    })

    // Se estiver fora da faixa, abre automaticamente uma ocorrência
    if (isNonConformant && parsed.data.parameter_id) {
      const paramName = await tx.qualityParameter.findFirst({ where: { id: parsed.data.parameter_id , tenant_id: (await getTenantId()) },
        select: { name: true }
      })
      
      const tenantId = await getTenantId()
      const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
        where: { tenant_id_severity: { tenant_id: tenantId, severity: 'HIGH' } }
      })
      const deadlineHours = defaultSeverity?.deadline_hours || 24
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + deadlineHours)

      await tx.occurrence.create({
        data: {
          tenant_id:   (await getTenantId()),
          description: `Não Conformidade (${paramName?.name}): Leitura registrada = ${parsed.data.value} ${unit}. O valor está fora dos limites aceitáveis. Ponto de Coleta: ${parsed.data.collection_point_id}`,
          severity:    'HIGH',
          status:      'OPEN',
          deadline,
          reported_by: userId,
        }
      })
    }
  })

  revalidatePath('/operador/leituras')
  revalidatePath('/operador/ocorrencias')
  revalidatePath('/operador/dashboard')
  revalidatePath('/tecnico/dashboard')
  revalidatePath('/gestor/dashboard')
  return { success: true }
}
