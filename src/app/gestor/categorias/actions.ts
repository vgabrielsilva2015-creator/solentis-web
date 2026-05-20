'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
}

const CategoriaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
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
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.create({
      data: { tenant_id: TENANT_ID, name: parsed.data.name, description: parsed.data.description, is_active: true },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao criar categoria. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  redirect('/gestor/categorias')
}

export async function editarCategoria(
  categoriaId: string,
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.update({
      where: { id: categoriaId },
      data:  { name: parsed.data.name, description: parsed.data.description },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${categoriaId}`)
  return { success: true }
}

export async function toggleAtivoCategoria(id: string): Promise<{ error?: string }> {
  await requireManager()
  const cat = await prisma.equipmentCategory.findUnique({ where: { id }, select: { is_active: true } })
  if (!cat) return { error: 'Categoria não encontrada.' }
  await prisma.equipmentCategory.update({ where: { id }, data: { is_active: !cat.is_active } })
  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${id}`)
  return {}
}
