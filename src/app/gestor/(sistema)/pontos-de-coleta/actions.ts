'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'


const PontoColetaSchema = z.object({
  name: z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  matrix: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
  is_field: z.preprocess((v) => v === 'on', z.boolean()),
  is_internal: z.preprocess((v) => v === 'on', z.boolean()),
  is_external: z.preprocess((v) => v === 'on', z.boolean()),
})

export type PontoColetaFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarPontoColeta(
  _prev: PontoColetaFormState,
  formData: FormData,
): Promise<PontoColetaFormState> {
  const ctx = await requirePermission('config.manage')

  const parsed = PontoColetaSchema.safeParse({
    name:        formData.get('name'),
    matrix:      formData.get('matrix'),
    location:    formData.get('location'),
    description: formData.get('description'),
    is_field:    formData.get('is_field'),
    is_internal: formData.get('is_internal'),
    is_external: formData.get('is_external'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  let novoId: string
  try {
    const ponto = await prisma.collectionPoint.create({
      data: {
        tenant_id:   ctx.tenantId,
        name:        parsed.data.name,
        matrix:      parsed.data.matrix,
        location:    parsed.data.location,
        description: parsed.data.description,
        is_active:   true,
        is_field:    parsed.data.is_field,
        is_internal: parsed.data.is_internal,
        is_external: parsed.data.is_external,
      },
    })
    novoId = ponto.id
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um ponto de coleta com este nome'] } }
    }
    return { error: 'Erro ao criar ponto de coleta. Tente novamente.' }
  }

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'CREATE',
    tableName: 'collection_points', recordId: novoId,
    after: { name: parsed.data.name, matrix: parsed.data.matrix, location: parsed.data.location },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  redirect('/gestor/pontos-de-coleta')
}

export async function editarPontoColeta(
  pontoId: string,
  _prev: PontoColetaFormState,
  formData: FormData,
): Promise<PontoColetaFormState> {
  const ctx = await requirePermission('config.manage')

  const parsed = PontoColetaSchema.safeParse({
    name:        formData.get('name'),
    matrix:      formData.get('matrix'),
    location:    formData.get('location'),
    description: formData.get('description'),
    is_field:    formData.get('is_field'),
    is_internal: formData.get('is_internal'),
    is_external: formData.get('is_external'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    const { count } = await prisma.collectionPoint.updateMany({
      where: { id: pontoId, tenant_id: ctx.tenantId },
      data:  {
        name:        parsed.data.name,
        matrix:      parsed.data.matrix,
        location:    parsed.data.location,
        description: parsed.data.description,
        is_field:    parsed.data.is_field,
        is_internal: parsed.data.is_internal,
        is_external: parsed.data.is_external,
      },
    })
    if (count === 0) return { error: 'Ponto de coleta não encontrado.' }
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um ponto de coleta com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'collection_points', recordId: pontoId,
    after: { name: parsed.data.name, matrix: parsed.data.matrix, location: parsed.data.location },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${pontoId}`)
  return { success: true }
}

export async function toggleAtivoPontoColeta(id: string): Promise<{ error?: string }> {
  const ctx = await requirePermission('config.manage')
  const pt = await prisma.collectionPoint.findFirst({
    where: { id, tenant_id: ctx.tenantId },
    select: { is_active: true }
  })
  if (!pt) return { error: 'Ponto de coleta não encontrado.' }

  await prisma.collectionPoint.updateMany({
    where: { id, tenant_id: ctx.tenantId },
    data:  { is_active: !pt.is_active }
  })

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'collection_points', recordId: id,
    before: { is_active: pt.is_active }, after: { is_active: !pt.is_active },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${id}`)
  return {}
}
