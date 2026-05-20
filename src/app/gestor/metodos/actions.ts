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

const MetodoSchema = z.object({
  name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

export type MetodoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarMetodo(
  _prev: MetodoFormState,
  formData: FormData,
): Promise<MetodoFormState> {
  await requireManager()

  const parsed = MetodoSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.create({
      data: {
        tenant_id:   TENANT_ID,
        name:        parsed.data.name,
        description: parsed.data.description,
        is_active:   true,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um método com este nome'] } }
    }
    return { error: 'Erro ao criar método. Tente novamente.' }
  }

  revalidatePath('/gestor/metodos')
  redirect('/gestor/metodos')
}

export async function editarMetodo(
  metodoId: string,
  _prev: MetodoFormState,
  formData: FormData,
): Promise<MetodoFormState> {
  await requireManager()

  const parsed = MetodoSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.update({
      where: { id: metodoId },
      data: {
        name:        parsed.data.name,
        description: parsed.data.description,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um método com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/metodos')
  revalidatePath(`/gestor/metodos/${metodoId}`)
  return { success: true }
}

export async function toggleAtivoMetodo(
  metodoId: string,
): Promise<{ error?: string }> {
  await requireManager()

  const metodo = await prisma.analysisMethod.findUnique({
    where:  { id: metodoId },
    select: { is_active: true },
  })
  if (!metodo) return { error: 'Método não encontrado.' }

  await prisma.analysisMethod.update({
    where: { id: metodoId },
    data:  { is_active: !metodo.is_active },
  })

  revalidatePath('/gestor/metodos')
  revalidatePath(`/gestor/metodos/${metodoId}`)
  return {}
}
