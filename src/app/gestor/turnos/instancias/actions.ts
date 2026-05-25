'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type EditHandoverFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Editar passagem (Gestor) ─────────────────────────────────────────────────

export async function editarPassagem(
  handoverId: string,
  _prev: EditHandoverFormState,
  formData: FormData,
): Promise<EditHandoverFormState> {
  const session = await requireManager()

  const parsed = EditHandoverSchema.safeParse({
    justification:         formData.get('justification'),
    outgoing_observations: formData.get('outgoing_observations'),
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findUnique({
    where:   { id: handoverId },
    include: { shift_instance: { select: { tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== TENANT_ID) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'CONFIRMED') {
    return { error: 'Apenas passagens confirmadas podem ser editadas.' }
  }

  const before = JSON.stringify({
    outgoing_observations: handover.outgoing_observations,
    incoming_observations: handover.incoming_observations,
  })
  const after = JSON.stringify({
    outgoing_observations: parsed.data.outgoing_observations,
    incoming_observations: parsed.data.incoming_observations,
  })

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.update({
      where: { id: handoverId },
      data: {
        outgoing_observations: parsed.data.outgoing_observations,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await tx.auditLog.create({
      data: {
        user_id:       userId,
        action:        'UPDATE',
        table_name:    'shift_handovers',
        record_id:     handoverId,
        before,
        after,
        justification: parsed.data.justification,
      },
    })
  })

  revalidatePath('/gestor/turnos/instancias')
  return { success: true }
}
