'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { STATUS_AGUARDANDO } from '@/lib/handover-status'



// ─── Schema ───────────────────────────────────────────────────────────────────

const EditHandoverSchema = z.object({
  justification: z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
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
  const ctx = await requirePermission('shift.manage')

  const parsed = EditHandoverSchema.safeParse({
    justification:         formData.get('justification'),
    outgoing_observations: formData.get('outgoing_observations'),
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

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
  shift_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione o turno'),
  date:     z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, 'Informe a data'),
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
  const ctx = await requirePermission('shift.manage')

  const parsed = PreAgendarSchema.safeParse({
    shift_id: formData.get('shift_id'),
    date:     formData.get('date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

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

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId, action: 'CREATE',
    tableName: 'shift_instances', recordId: instance.id,
    after: { shift_id: parsed.data.shift_id, date: parsed.data.date, status: 'SCHEDULED' },
  })

  revalidatePath('/gestor/turnos/tarefas')
  return { success: true, instanceId: instance.id }
}

// ─── Encerrar turno à força (M-05) ────────────────────────────────────────────
// O gestor encerra um turno preso (aberto ou aguardando passagem que nunca foi
// confirmada), com justificativa obrigatória. Uma passagem ainda "aguardando" vai
// para FORCE_CLOSED: sai do alerta do sino e não pode mais ser confirmada.

const EncerrarForcadoSchema = z.object({
  justification: z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').min(10, 'A justificativa deve ter pelo menos 10 caracteres.'),
})

export type EncerrarForcadoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export async function encerrarTurnoForcado(
  instanceId: string,
  _prev: EncerrarForcadoFormState,
  formData: FormData,
): Promise<EncerrarForcadoFormState> {
  const ctx = await requirePermission('shift.manage')

  const parsed = EncerrarForcadoSchema.safeParse({
    justification: formData.get('justification'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = ctx.tenantId

  const instance = await prisma.shiftInstance.findFirst({
    where:   { id: instanceId, tenant_id: tenantId },
    include: { handover: { select: { id: true, status: true } } },
  })
  if (!instance) return { error: 'Turno não encontrado.' }
  if (instance.status === 'CLOSED') return { error: 'Este turno já está encerrado.' }
  if (instance.status !== 'OPEN' && instance.status !== 'HANDOVER_PENDING') {
    return { error: 'Só é possível encerrar à força um turno aberto ou aguardando passagem.' }
  }

  const now = new Date()
  let fechou = false
  await prisma.$transaction(async (tx) => {
    // Condiciona ao estado lido: numa corrida, só o primeiro encerra.
    const { count } = await tx.shiftInstance.updateMany({
      where: { id: instanceId, tenant_id: tenantId, status: { in: ['OPEN', 'HANDOVER_PENDING'] } },
      data:  { status: 'CLOSED', closed_at: now },
    })
    if (count === 0) return
    fechou = true

    // Passagem ainda aguardando → FORCE_CLOSED (sai do STATUS_AGUARDANDO: o alerta
    // do sino some e confirmarPassagem passa a recusá-la).
    if (instance.handover && (STATUS_AGUARDANDO as readonly string[]).includes(instance.handover.status)) {
      await tx.shiftHandover.updateMany({
        where: { id: instance.handover.id, tenant_id: tenantId },
        data:  { status: 'FORCE_CLOSED', confirmed_at: now },
      })
    }

    await logAudit(tx, {
      tenantId, userId: ctx.userId, action: 'UPDATE',
      tableName: 'shift_instances', recordId: instanceId,
      before: { status: instance.status },
      after:  { status: 'CLOSED', evento: 'encerramento_forcado' },
      justification: parsed.data.justification,
    })
  })

  if (!fechou) return { error: 'O estado do turno mudou enquanto você agia. Recarregue a página e tente de novo.' }

  revalidatePath('/gestor/turnos/tarefas')
  revalidatePath(`/gestor/turnos/tarefas/${instanceId}`)
  return { success: true }
}

