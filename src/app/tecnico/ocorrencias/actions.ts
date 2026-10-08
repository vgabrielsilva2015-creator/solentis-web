'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'



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
  const ctx = await requirePermission('occurrence.resolve')

  const parsed = ResolucaoSchema.safeParse({
    resolution_notes: formData.get('resolution_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

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
