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
}

const nullable = (v: unknown) => (v === '' || v == null ? null : String(v))

const PontoSchema = z.object({
  name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location:    z.preprocess(nullable, z.string().nullable()),
  description: z.preprocess(nullable, z.string().nullable()),
})

export type PontoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarPonto(
  _prev: PontoFormState,
  formData: FormData,
): Promise<PontoFormState> {
  await requireManager()

  const parsed = PontoSchema.safeParse({
    name:        formData.get('name'),
    location:    formData.get('location'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.collectionPoint.create({
    data: {
      tenant_id:   TENANT_ID,
      name:        parsed.data.name,
      location:    parsed.data.location,
      description: parsed.data.description,
      is_active:   true,
    },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  redirect('/gestor/pontos-de-coleta')
}

export async function editarPonto(
  pontoId: string,
  _prev: PontoFormState,
  formData: FormData,
): Promise<PontoFormState> {
  await requireManager()

  const parsed = PontoSchema.safeParse({
    name:        formData.get('name'),
    location:    formData.get('location'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.collectionPoint.update({
    where: { id: pontoId },
    data:  { name: parsed.data.name, location: parsed.data.location, description: parsed.data.description },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${pontoId}`)
  return { success: true }
}

export async function toggleAtivoPonto(id: string): Promise<{ error?: string }> {
  await requireManager()
  const ponto = await prisma.collectionPoint.findUnique({ where: { id }, select: { is_active: true } })
  if (!ponto) return { error: 'Ponto de coleta não encontrado.' }
  await prisma.collectionPoint.update({ where: { id }, data: { is_active: !ponto.is_active } })
  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${id}`)
  return {}
}
