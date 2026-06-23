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

const PontoColetaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  matrix: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
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
  await requireManager()

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
    await prisma.collectionPoint.create({
      data: {
        tenant_id:   (await getTenantId()),
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um ponto de coleta com este nome'] } }
    }
    return { error: 'Erro ao criar ponto de coleta. Tente novamente.' }
  }

  revalidatePath('/gestor/pontos-de-coleta')
  redirect('/gestor/pontos-de-coleta')
}

export async function editarPontoColeta(
  pontoId: string,
  _prev: PontoColetaFormState,
  formData: FormData,
): Promise<PontoColetaFormState> {
  await requireManager()

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
    await prisma.collectionPoint.updateMany({
      where: { id: pontoId, tenant_id: (await getTenantId()) },
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um ponto de coleta com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${pontoId}`)
  return { success: true }
}

export async function toggleAtivoPontoColeta(id: string): Promise<{ error?: string }> {
  await requireManager()
  const pt = await prisma.collectionPoint.findFirst({
    where: { id, tenant_id: (await getTenantId()) },
    select: { is_active: true }
  })
  if (!pt) return { error: 'Ponto de coleta não encontrado.' }
  
  await prisma.collectionPoint.updateMany({
    where: { id, tenant_id: (await getTenantId()) },
    data:  { is_active: !pt.is_active }
  })
  
  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${id}`)
  return {}
}
