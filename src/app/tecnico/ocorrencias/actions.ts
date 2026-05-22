'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const TENANT_ID = 'default'

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const ResolucaoSchema = z.object({
  resolution_notes: z.string().min(5, 'Descreva a resolução em pelo menos 5 caracteres'),
})

export type ResolucaoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Resolver ocorrência ──────────────────────────────────────────────────────

export async function resolverOcorrencia(
  ocorrenciaId: string,
  _prev: ResolucaoFormState,
  formData: FormData,
): Promise<ResolucaoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = ResolucaoSchema.safeParse({
    resolution_notes: formData.get('resolution_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const occurrence = await prisma.occurrence.findUnique({
    where:  { id: ocorrenciaId },
    select: { status: true },
  })
  if (!occurrence)                        return { error: 'Ocorrência não encontrada.' }
  if (occurrence.status === 'RESOLVED')   return { error: 'Ocorrência já encerrada.' }

  await prisma.occurrence.update({
    where: { id: ocorrenciaId },
    data: {
      status:           'RESOLVED',
      resolved_at:      new Date(),
      resolved_by:      userId,
      resolution_notes: parsed.data.resolution_notes,
    },
  })

  revalidatePath('/tecnico/ocorrencias')
  revalidatePath(`/tecnico/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/operador/ocorrencias')
  return { success: true }
}
