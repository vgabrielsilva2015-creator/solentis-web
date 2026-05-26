'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'

const TENANT_ID = 'default'

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
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
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar leituras.' }

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
    const param = await prisma.qualityParameter.findUnique({
      where:  { id: parsed.data.parameter_id },
      select: { min_limit: true, max_limit: true, unit: true },
    })
    if (param) {
      // Copia a unidade do parâmetro quando o formulário não enviou uma
      unit = unit ?? param.unit
      isNonConformant = calcularNaoConformidade(
        parsed.data.value,
        param.min_limit,
        param.max_limit,
      )
    }
  }

  await prisma.reading.create({
    data: {
      tenant_id:           TENANT_ID,
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
      recorded_at:         new Date(parsed.data.recorded_at),
    },
  })

  revalidatePath('/operador/leituras')
  return { success: true }
}
