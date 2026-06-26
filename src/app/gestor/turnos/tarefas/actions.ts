'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    redirect('/login')
  }
  return session
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

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: { shift_instance: { select: { tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'CONFIRMED') {
    return { error: 'Apenas passagens confirmadas podem ser editadas.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.updateMany({ where: { id: handoverId , tenant_id: (await getTenantId()) }, data: {
        outgoing_observations: parsed.data.outgoing_observations,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await logAudit(tx, {
      tenantId: (await getTenantId()),
      userId,
      action:        'UPDATE',
      tableName:     'shift_handovers',
      recordId:      handoverId,
      before:        { outgoing_observations: handover.outgoing_observations, incoming_observations: handover.incoming_observations },
      after:         { outgoing_observations: parsed.data.outgoing_observations, incoming_observations: parsed.data.incoming_observations },
      justification: parsed.data.justification,
    })
  })

  revalidatePath('/gestor/turnos/tarefas')
  return { success: true }
}

// ─── Pré-agendar turno (criar instância futura com status SCHEDULED) ──────────

const PreAgendarSchema = z.object({
  shift_id: z.string().min(1, 'Selecione o turno'),
  date:     z.string().min(1, 'Informe a data'),
})

export type PreAgendarFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  instanceId?: string
}

export async function preAgendarTurno(
  _prev: PreAgendarFormState,
  formData: FormData,
): Promise<PreAgendarFormState> {
  const session = await requireManager()

  const parsed = PreAgendarSchema.safeParse({
    shift_id: formData.get('shift_id'),
    date:     formData.get('date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const shift = await prisma.shift.findFirst({
    where:  { id: parsed.data.shift_id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  const targetDate = new Date(parsed.data.date + 'T00:00:00')

  // Verifica duplicado
  const existing = await prisma.shiftInstance.findFirst({
    where: {
      tenant_id: (await getTenantId()),
      shift_id:  parsed.data.shift_id,
      date:      targetDate,
    },
  })
  if (existing) {
    return { error: 'Já existe uma instância para esse turno nessa data.' }
  }

  const instance = await prisma.shiftInstance.create({
    data: {
      tenant_id: (await getTenantId()),
      shift_id:  parsed.data.shift_id,
      date:      targetDate,
      opened_by: userId,
      opened_at: new Date(),
      status:    'SCHEDULED',
    },
  })

  revalidatePath('/gestor/turnos/tarefas')
  return { success: true, instanceId: instance.id }
}

