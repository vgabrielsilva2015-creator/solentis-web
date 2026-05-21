'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { addDays } from '@/lib/equipment-utils'

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

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EquipamentoSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category_id: z.string().min(1, 'Selecione a categoria'),
  serial_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  installation_date: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  preventive_frequency_days: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseInt(String(v), 10)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe a frequência em dias' }).int().min(1, 'Mínimo de 1 dia'),
  ),
})

const CorretivaSchema = z.object({
  description: z.string().min(5, 'Descreva o problema em pelo menos 5 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a prioridade',
  }),
  start_date: z.string().min(1, 'Informe a data de início'),
  notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000).nullable(),
  ),
  estimated_cost: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseFloat(String(v))
      return isNaN(n) ? null : String(n)
    },
    z.string().nullable(),
  ),
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type EquipamentoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export type CorretivaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Equipamento: criar ───────────────────────────────────────────────────────

export async function criarEquipamento(
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const firstScheduledDate = addDays(new Date(), parsed.data.preventive_frequency_days)

  // Cria equipamento e primeira preventiva na mesma transação
  await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.create({
      data: {
        tenant_id:                 TENANT_ID,
        name:                      parsed.data.name,
        category_id:               parsed.data.category_id,
        serial_number:             parsed.data.serial_number,
        location:                  parsed.data.location,
        installation_date:         parsed.data.installation_date
          ? new Date(parsed.data.installation_date)
          : null,
        preventive_frequency_days: parsed.data.preventive_frequency_days,
        is_active:                 true,
        created_by:                userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      TENANT_ID,
        equipment_id:   equipment.id,
        scheduled_date: firstScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  return { success: true }
}

// ─── Equipamento: editar ──────────────────────────────────────────────────────
// Alterar a frequência NÃO reagenda a preventiva já existente.

export async function editarEquipamento(
  equipamentoId: string,
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const equipment = await prisma.equipment.findUnique({
    where:  { id: equipamentoId },
    select: { id: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.update({
    where: { id: equipamentoId },
    data: {
      name:                      parsed.data.name,
      category_id:               parsed.data.category_id,
      serial_number:             parsed.data.serial_number,
      location:                  parsed.data.location,
      installation_date:         parsed.data.installation_date
        ? new Date(parsed.data.installation_date)
        : null,
      preventive_frequency_days: parsed.data.preventive_frequency_days,
    },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Equipamento: toggle ativo ────────────────────────────────────────────────

export async function toggleAtivoEquipamento(
  equipamentoId: string,
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const equipment = await prisma.equipment.findUnique({
    where:  { id: equipamentoId },
    select: { is_active: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.update({
    where: { id: equipamentoId },
    data:  { is_active: !equipment.is_active },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return {}
}

// ─── Preventiva: concluir e agendar a próxima ─────────────────────────────────

export async function concluirPreventiva(
  preventivaId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const preventiva = await prisma.preventiveMaintenance.findUnique({
    where:   { id: preventivaId },
    include: { equipment: { select: { id: true, preventive_frequency_days: true } } },
  })
  if (!preventiva)                    return { error: 'Preventiva não encontrada.' }
  if (preventiva.status === 'COMPLETED') return { error: 'Preventiva já concluída.' }

  const completedDate = new Date()
  const nextScheduledDate = addDays(completedDate, preventiva.equipment.preventive_frequency_days)

  await prisma.$transaction(async (tx) => {
    await tx.preventiveMaintenance.update({
      where: { id: preventivaId },
      data: {
        status:         'COMPLETED',
        completed_date: completedDate,
        completed_by:   userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      TENANT_ID,
        equipment_id:   preventiva.equipment.id,
        scheduled_date: nextScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${preventiva.equipment.id}`)
  return {}
}

// ─── Corretiva: registrar ─────────────────────────────────────────────────────

export async function registrarCorretiva(
  equipamentoId: string,
  _prev: CorretivaFormState,
  formData: FormData,
): Promise<CorretivaFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = CorretivaSchema.safeParse({
    description:    formData.get('description'),
    priority:       formData.get('priority'),
    start_date:     formData.get('start_date'),
    notes:          formData.get('notes'),
    estimated_cost: formData.get('estimated_cost'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  await prisma.correctiveMaintenance.create({
    data: {
      tenant_id:      TENANT_ID,
      equipment_id:   equipamentoId,
      description:    parsed.data.description,
      responsible_id: userId,        // auto-preenche com o usuário logado
      priority:       parsed.data.priority,
      start_date:     new Date(parsed.data.start_date),
      status:         'IN_PROGRESS',
      notes:          parsed.data.notes,
      estimated_cost: parsed.data.estimated_cost ?? undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Corretiva: concluir ou cancelar ─────────────────────────────────────────

export async function atualizarStatusCorretiva(
  corretivaId: string,
  status: 'COMPLETED' | 'CANCELLED',
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const corretiva = await prisma.correctiveMaintenance.findUnique({
    where:  { id: corretivaId },
    select: { status: true, equipment_id: true },
  })
  if (!corretiva)                      return { error: 'Corretiva não encontrada.' }
  if (corretiva.status !== 'IN_PROGRESS') return { error: 'Corretiva já encerrada.' }

  await prisma.correctiveMaintenance.update({
    where: { id: corretivaId },
    data: {
      status,
      end_date: status === 'COMPLETED' ? new Date() : undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${corretiva.equipment_id}`)
  return {}
}
