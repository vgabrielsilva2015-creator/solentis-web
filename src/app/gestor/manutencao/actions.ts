'use server'

import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { localInputToUTC } from '@/lib/date-utils'

export type ManutencaoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Agendar preventiva avulsa ────────────────────────────────────────────────

const PreventivaSchema = z.object({
  equipment_id:   z.string().min(1, 'Selecione o equipamento'),
  scheduled_date: z.string().min(1, 'Informe a data agendada'),
})

export async function agendarPreventiva(
  _prev: ManutencaoFormState,
  formData: FormData,
): Promise<ManutencaoFormState> {
  await requireRole(['MANAGER'])
  const tenantId = await getTenantId()

  const parsed = PreventivaSchema.safeParse({
    equipment_id:   formData.get('equipment_id'),
    scheduled_date: formData.get('scheduled_date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // Garante que o equipamento pertence ao tenant
  const equipment = await prisma.equipment.findFirst({
    where:  { id: parsed.data.equipment_id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!equipment) return { error: 'Equipamento inválido ou não autorizado.' }

  await prisma.preventiveMaintenance.create({
    data: {
      tenant_id:      tenantId,
      equipment_id:   parsed.data.equipment_id,
      scheduled_date: localInputToUTC(parsed.data.scheduled_date),
      status:         'SCHEDULED',
    },
  })

  revalidatePath('/gestor/manutencao/preventivas')
  revalidatePath(`/gestor/equipamentos/${parsed.data.equipment_id}`)
  return { success: true }
}

// ─── Abrir corretiva ──────────────────────────────────────────────────────────

const CorretivaSchema = z.object({
  equipment_id:   z.string().min(1, 'Selecione o equipamento'),
  description:    z.string().min(3, 'Descreva o problema'),
  priority:       z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  start_date:     z.string().min(1, 'Informe a data de abertura'),
  responsible_id: z.preprocess((v) => (v === '' || v == null ? null : String(v)), z.string().nullable()),
  notes:          z.preprocess((v) => (v === '' || v == null ? null : String(v)), z.string().nullable()),
})

const DEADLINE_HOURS = { LOW: 72, MEDIUM: 48, HIGH: 24, CRITICAL: 12 } as const

export async function criarCorretiva(
  _prev: ManutencaoFormState,
  formData: FormData,
): Promise<ManutencaoFormState> {
  const session = await requireRole(['MANAGER'])
  const tenantId = await getTenantId()

  const parsed = CorretivaSchema.safeParse({
    equipment_id:   formData.get('equipment_id'),
    description:    formData.get('description'),
    priority:       formData.get('priority'),
    start_date:     formData.get('start_date'),
    responsible_id: formData.get('responsible_id'),
    notes:          formData.get('notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const equipment = await prisma.equipment.findFirst({
    where:  { id: parsed.data.equipment_id, tenant_id: tenantId },
    select: { id: true },
  })
  if (!equipment) return { error: 'Equipamento inválido ou não autorizado.' }

  // Responsável: escolhido no formulário, ou o próprio gestor logado como fallback
  let responsibleId = parsed.data.responsible_id
  if (responsibleId) {
    const resp = await prisma.user.findFirst({
      where: { id: responsibleId, tenant_id: tenantId, is_active: true },
      select: { id: true },
    })
    if (!resp) return { error: 'Responsável inválido.' }
  } else {
    responsibleId = await resolveUserId(session.user.email!)
  }
  if (!responsibleId) return { error: 'Sessão inválida.' }

  const deadlineHours = DEADLINE_HOURS[parsed.data.priority] ?? 48
  const startDate = localInputToUTC(parsed.data.start_date)
  const deadline = new Date(startDate.getTime() + deadlineHours * 60 * 60 * 1000)

  await prisma.correctiveMaintenance.create({
    data: {
      tenant_id:      tenantId,
      equipment_id:   parsed.data.equipment_id,
      description:    parsed.data.description,
      responsible_id: responsibleId,
      priority:       parsed.data.priority,
      start_date:     startDate,
      status:         'OPEN',
      notes:          parsed.data.notes,
      deadline,
    },
  })

  revalidatePath('/gestor/manutencao/corretivas')
  revalidatePath(`/gestor/equipamentos/${parsed.data.equipment_id}`)
  return { success: true }
}
