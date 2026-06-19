'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
}

const MetodoSchema = z.object({
  name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  pop_content: z.preprocess(
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
    pop_content: formData.get('pop_content'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.create({
      data: {
        tenant_id:   (await getTenantId()),
        name:        parsed.data.name,
        description: parsed.data.description,
        pop_content: parsed.data.pop_content,
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
    pop_content: formData.get('pop_content'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.updateMany({ where: { id: metodoId , tenant_id: (await getTenantId()) }, data: {
        name:        parsed.data.name,
        description: parsed.data.description,
        pop_content: parsed.data.pop_content,
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

  const metodo = await prisma.analysisMethod.findFirst({ where: { id: metodoId , tenant_id: (await getTenantId()) },
    select: { is_active: true },
  })
  if (!metodo) return { error: 'Método não encontrado.' }

  await prisma.analysisMethod.updateMany({ where: { id: metodoId , tenant_id: (await getTenantId()) }, data:  { is_active: !metodo.is_active },
  })

  revalidatePath('/gestor/metodos')
  revalidatePath(`/gestor/metodos/${metodoId}`)
  return {}
}

export async function criarPontoMetodo(methodId: string, name: string) {
  await requireManager()
  const tenant_id = await getTenantId()
  await prisma.collectionPoint.create({
    data: {
      tenant_id,
      name,
      method_id: methodId,
      is_active: true,
    }
  })
  revalidatePath(`/gestor/metodos/${methodId}`)
}

export async function removerPontoMetodo(pointId: string) {
  await requireManager()
  const tenant_id = await getTenantId()
  const point = await prisma.collectionPoint.findFirst({
    where: { id: pointId, tenant_id }
  })
  if (!point) return
  
  await prisma.collectionPoint.deleteMany({
    where: { id: pointId, tenant_id }
  })
  if (point.method_id) {
    revalidatePath(`/gestor/metodos/${point.method_id}`)
  }
}
