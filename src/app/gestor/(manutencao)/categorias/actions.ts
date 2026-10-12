'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'



const CategoriaSchema = z.object({
  name: z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
})

export type CategoriaFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarCategoria(
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  const ctx = await requirePermission('config.manage')

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  let novaId: string
  try {
    const cat = await prisma.equipmentCategory.create({
      data: { tenant_id: ctx.tenantId, name: parsed.data.name, description: parsed.data.description, is_active: true },
    })
    novaId = cat.id
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao criar categoria. Tente novamente.' }
  }

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'CREATE',
    tableName: 'equipment_categories', recordId: novaId,
    after: { name: parsed.data.name, description: parsed.data.description },
  })

  revalidatePath('/gestor/categorias')
  redirect('/gestor/categorias')
}

export async function editarCategoria(
  categoriaId: string,
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  const ctx = await requirePermission('config.manage')

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    const { count } = await prisma.equipmentCategory.updateMany({ where: { id: categoriaId , tenant_id: ctx.tenantId }, data:  { name: parsed.data.name, description: parsed.data.description },
    })
    if (count === 0) return { error: 'Categoria não encontrada.' }
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'equipment_categories', recordId: categoriaId,
    after: { name: parsed.data.name, description: parsed.data.description },
  })

  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${categoriaId}`)
  return { success: true }
}

export async function toggleAtivoCategoria(id: string): Promise<{ error?: string }> {
  const ctx = await requirePermission('config.manage')
  const cat = await prisma.equipmentCategory.findFirst({ where: { id, tenant_id: ctx.tenantId }, select: { is_active: true } })
  if (!cat) return { error: 'Categoria não encontrada.' }
  await prisma.equipmentCategory.updateMany({ where: { id, tenant_id: ctx.tenantId }, data: { is_active: !cat.is_active } })
  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'equipment_categories', recordId: id,
    before: { is_active: cat.is_active }, after: { is_active: !cat.is_active },
  })
  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${id}`)
  return {}
}
