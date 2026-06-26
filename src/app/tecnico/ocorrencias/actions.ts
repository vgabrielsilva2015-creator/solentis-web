'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
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

  const occurrence = await prisma.occurrence.findFirst({ where: { id: ocorrenciaId , tenant_id: (await getTenantId()) },
    select: { status: true, severity: true },
  })
  if (!occurrence)                        return { error: 'Ocorrência não encontrada.' }
  if (occurrence.status === 'RESOLVED')   return { error: 'Ocorrência já encerrada.' }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.occurrence.updateMany({ where: { id: ocorrenciaId , tenant_id: (await getTenantId()) }, data: {
        status:           'RESOLVED',
        resolved_at:      now,
        resolved_by:      userId,
        resolution_notes: parsed.data.resolution_notes,
      },
    })
    await logAudit(tx, {
      tenantId: (await getTenantId()),
      userId,
      action:    'UPDATE',
      tableName: 'occurrences',
      recordId:  ocorrenciaId,
      before:    { status: occurrence.status },
      after:     { status: 'RESOLVED', resolved_by: userId, resolution_notes: parsed.data.resolution_notes },
    })
  })

  revalidatePath('/tecnico/ocorrencias')
  revalidatePath(`/tecnico/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/operador/ocorrencias')
  return { success: true }
}
