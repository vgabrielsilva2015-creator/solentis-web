'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
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
  default_method_name: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  collection_points: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
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
    where: { tenant_id_email: { tenant_id: (await getTenantId()), email } },
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
    default_method_name: formData.get('default_method_name'),
    collection_points: formData.get('collection_points'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const created = await prisma.$transaction(async (tx) => {
    let methodId = null
    if (parsed.data.default_method_name) {
      const methodName = parsed.data.default_method_name.trim()
      let method = await tx.analysisMethod.findUnique({
        where: { tenant_id_name: { tenant_id: tenantId, name: methodName } }
      })
      if (!method) {
        method = await tx.analysisMethod.create({ data: { tenant_id: tenantId, name: methodName } })
      }
      methodId = method.id
    }

    const cpNames = parsed.data.collection_points ? parsed.data.collection_points.split(',').map(s => s.trim()).filter(Boolean) : []
    const cpIds = []
    for (const cpName of cpNames) {
      let cp = await tx.collectionPoint.findFirst({
        where: { tenant_id: tenantId, name: { equals: cpName, mode: 'insensitive' } }
      })
      if (!cp) {
        cp = await tx.collectionPoint.create({ data: { tenant_id: tenantId, name: cpName } })
      }
      cpIds.push(cp.id)
    }

    const param = await tx.qualityParameter.create({
      data: {
        tenant_id:       tenantId,
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  new Date(parsed.data.effective_date + 'T00:00:00.000Z'),
        is_active:       true,
        created_by:      userId,
        default_method_id: methodId,
        collection_points: {
          connect: cpIds.map(id => ({ id }))
        }
      },
      select: { id: true },
    })
    await logAudit(tx, {
      tenantId,
      userId,
      action:    'CREATE',
      tableName: 'quality_parameters',
      recordId:  param.id,
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit },
    })
    return param
  })
  void created

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
    default_method_name: formData.get('default_method_name'),
    collection_points: formData.get('collection_points'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()
  const [current, userId] = await Promise.all([
    prisma.qualityParameter.findFirst({ where: { id: parametroId , tenant_id: tenantId },
      select: { name: true, unit: true, min_limit: true, max_limit: true, effective_date: true },
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

  await prisma.$transaction(async (tx) => {
    let methodId = null
    if (parsed.data.default_method_name) {
      const methodName = parsed.data.default_method_name.trim()
      let method = await tx.analysisMethod.findUnique({
        where: { tenant_id_name: { tenant_id: tenantId, name: methodName } }
      })
      if (!method) {
        method = await tx.analysisMethod.create({ data: { tenant_id: tenantId, name: methodName } })
      }
      methodId = method.id
    }

    const cpNames = parsed.data.collection_points ? parsed.data.collection_points.split(',').map(s => s.trim()).filter(Boolean) : []
    const cpIds = []
    for (const cpName of cpNames) {
      let cp = await tx.collectionPoint.findFirst({
        where: { tenant_id: tenantId, name: { equals: cpName, mode: 'insensitive' } }
      })
      if (!cp) {
        cp = await tx.collectionPoint.create({ data: { tenant_id: tenantId, name: cpName } })
      }
      cpIds.push(cp.id)
    }

    if (limitsChanged) {
      await tx.parameterHistory.create({
        data: {
          parameter_id:          parametroId,
          min_limit_before:      current.min_limit,
          max_limit_before:      current.max_limit,
          min_limit_after:       parsed.data.min_limit,
          max_limit_after:       parsed.data.max_limit,
          effective_date_before: current.effective_date,
          effective_date_after:  newDate,
          changed_by:            userId,
        },
      })
    }

    await tx.qualityParameter.update({ 
      where: { id: parametroId }, 
      data: {
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  newDate,
        default_method_id: methodId,
        collection_points: {
          set: cpIds.map(id => ({ id }))
        }
      },
    })

    await logAudit(tx, {
      tenantId,
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { name: current.name, unit: current.unit, min_limit: current.min_limit, max_limit: current.max_limit, effective_date: current.effective_date },
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit, effective_date: newDate },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return { success: true }
}

// ─── Toggle ativo ─────────────────────────────────────────────────────────────

export async function toggleAtivoParametro(
  parametroId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [param, userId] = await Promise.all([
    prisma.qualityParameter.findFirst({ where: { id: parametroId , tenant_id: (await getTenantId()) },
      select: { is_active: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!param) return { error: 'Parâmetro não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.qualityParameter.updateMany({ where: { id: parametroId , tenant_id: (await getTenantId()) }, data:  { is_active: !param.is_active },
    })
    await logAudit(tx, {
      tenantId: (await getTenantId()),
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { is_active:  param.is_active  },
      after:     { is_active: !param.is_active  },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return {}
}
