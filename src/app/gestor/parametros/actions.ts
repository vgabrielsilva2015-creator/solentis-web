'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
  return session
}

const ParametroSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  unit: z.string().min(1, 'Informe a unidade'),
  min_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  max_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  legal_reference: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  effective_date: z.string().min(1, 'Informe a data de vigência'),
}).refine(
  (d) => d.min_limit === null || d.max_limit === null || d.min_limit < d.max_limit,
  { message: 'Limite mínimo deve ser menor que o máximo', path: ['max_limit'] },
)

export type ParametroFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarParametro(
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    effective_date:  formData.get('effective_date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  await prisma.qualityParameter.create({
    data: {
      tenant_id:       TENANT_ID,
      name:            parsed.data.name,
      unit:            parsed.data.unit,
      min_limit:       parsed.data.min_limit,
      max_limit:       parsed.data.max_limit,
      legal_reference: parsed.data.legal_reference,
      effective_date:  new Date(parsed.data.effective_date + 'T00:00:00.000Z'),
      is_active:       true,
      created_by:      userId,
    },
  })

  revalidatePath('/gestor/parametros')
  redirect('/gestor/parametros')
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarParametro(
  parametroId: string,
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    effective_date:  formData.get('effective_date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [current, userId] = await Promise.all([
    prisma.qualityParameter.findUnique({
      where:  { id: parametroId },
      select: { min_limit: true, max_limit: true, effective_date: true },
    }),
    resolveUserId(session.user.email!),
  ])

  if (!current) return { error: 'Parâmetro não encontrado.' }
  if (!userId)  return { error: 'Sessão inválida.' }

  const newDate = new Date(parsed.data.effective_date + 'T00:00:00.000Z')

  const limitsChanged =
    current.min_limit        !== parsed.data.min_limit ||
    current.max_limit        !== parsed.data.max_limit ||
    current.effective_date.getTime() !== newDate.getTime()

  if (limitsChanged) {
    await prisma.parameterHistory.create({
      data: {
        parameter_id:         parametroId,
        min_limit_before:     current.min_limit,
        max_limit_before:     current.max_limit,
        min_limit_after:      parsed.data.min_limit,
        max_limit_after:      parsed.data.max_limit,
        effective_date_before: current.effective_date,
        effective_date_after:  newDate,
        changed_by:           userId,
      },
    })
  }

  await prisma.qualityParameter.update({
    where: { id: parametroId },
    data: {
      name:            parsed.data.name,
      unit:            parsed.data.unit,
      min_limit:       parsed.data.min_limit,
      max_limit:       parsed.data.max_limit,
      legal_reference: parsed.data.legal_reference,
      effective_date:  newDate,
    },
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return { success: true }
}

// ─── Toggle ativo ─────────────────────────────────────────────────────────────

export async function toggleAtivoParametro(
  parametroId: string,
): Promise<{ error?: string }> {
  await requireManager()

  const param = await prisma.qualityParameter.findUnique({
    where:  { id: parametroId },
    select: { is_active: true },
  })
  if (!param) return { error: 'Parâmetro não encontrado.' }

  await prisma.qualityParameter.update({
    where: { id: parametroId },
    data:  { is_active: !param.is_active },
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return {}
}
