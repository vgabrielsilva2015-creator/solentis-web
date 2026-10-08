'use server'

import { permissionError, requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR, numeroBROpcional } from '@/lib/zod-ptbr'
import { INVALIDO, parseNumeroBR } from '@/lib/number-ptbr'
import { revalidatePath } from 'next/cache'
import { addDays } from '@/lib/equipment-utils'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'
import { saveUpload, saveImageUpload } from '@/lib/storage'



// ─── Schemas ──────────────────────────────────────────────────────────────────

const EquipamentoSchema = z.object({
  name: z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione a categoria'),
  serial_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  installation_date: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').nullable(),
  ),
  preventive_frequency_days: numeroBR({ inteiro: true, min: 1, rotulo: 'A frequência', obrigatorio: 'Informe a frequência em dias' }),
  manufacturer: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  model_name: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
  ),
  status: z.enum(['OPERATING', 'MAINTENANCE', 'INACTIVE', 'SCRAPPED']).default('OPERATING'),
  responsible_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').nullable(),
  ),
})

const CorretivaSchema = z.object({
  description: z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').min(5, 'Descreva o problema em pelo menos 5 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a prioridade',
  }),
  start_date: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, 'Informe a data de início'),
  notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000).nullable(),
  ),
  // T-16: antes "1.500,00" virava 1,5 (e texto inválido era ignorado em silêncio)
  estimated_cost: numeroBROpcional({ min: 0, rotulo: 'O custo estimado' }).transform((n) => (n == null ? null : String(n))),
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
  const ctx = await requirePermission('equipment.maintain')

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
    manufacturer:              formData.get('manufacturer'),
    model_name:                formData.get('model_name'),
    status:                    formData.get('status') || 'OPERATING',
    responsible_id:            formData.get('responsible_id') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

  const erroPosse = await checkOwnership(await getTenantId(), [
    { model: 'equipmentCategory', id: parsed.data.category_id },
    { model: 'user', id: parsed.data.responsible_id, optional: true, message: 'Responsável inválido ou não autorizado.' },
  ])
  if (erroPosse) return { error: erroPosse }

  // Trata upload de arquivos
  const photoFile = formData.get('photo_file') as File | null
  const manualFile = formData.get('manual_file') as File | null

  let photo_url: string | null = null
  let manual_url: string | null = null

  if (photoFile && photoFile.size > 0) {
    try {
      photo_url = await saveImageUpload(photoFile, 'equipments', 5 * 1024 * 1024)
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Erro no upload da foto.' }
    }
  }

  if (manualFile && manualFile.size > 0) {
    if (manualFile.size > 10 * 1024 * 1024) {
      return { error: 'O manual deve ter no máximo 10 MB.' }
    }
    const buffer = Buffer.from(await manualFile.arrayBuffer())
    // Confere a assinatura "%PDF" no início do arquivo, não só o Content-Type.
    if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
      return { error: 'O manual deve ser um arquivo PDF válido.' }
    }
    const filename = `${crypto.randomUUID()}.pdf`
    manual_url = await saveUpload('equipments', filename, buffer, 'application/pdf')
  }

  const firstScheduledDate = addDays(new Date(), parsed.data.preventive_frequency_days)

  // Cria equipamento e primeira preventiva na mesma transação
  await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.create({
      data: {
        tenant_id:                 (await getTenantId()),
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
        manufacturer:              parsed.data.manufacturer,
        model_name:                parsed.data.model_name,
        status:                    parsed.data.status,
        responsible_id:            parsed.data.responsible_id,
        photo_url,
        manual_url,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      (await getTenantId()),
        equipment_id:   equipment.id,
        scheduled_date: firstScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath('/gestor/equipamentos')
  return { success: true }
}

// ─── Equipamento: editar ──────────────────────────────────────────────────────

export async function editarEquipamento(
  equipamentoId: string,
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  await requirePermission('equipment.maintain')

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
    manufacturer:              formData.get('manufacturer'),
    model_name:                formData.get('model_name'),
    status:                    formData.get('status') || 'OPERATING',
    responsible_id:            formData.get('responsible_id') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const equipment = await prisma.equipment.findFirst({
    where: { id: equipamentoId, tenant_id: (await getTenantId()) },
    select: { id: true, photo_url: true, manual_url: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  const erroPosse = await checkOwnership(await getTenantId(), [
    { model: 'equipmentCategory', id: parsed.data.category_id },
    { model: 'user', id: parsed.data.responsible_id, optional: true, message: 'Responsável inválido ou não autorizado.' },
  ])
  if (erroPosse) return { error: erroPosse }

  // Trata upload de arquivos
  const photoFile = formData.get('photo_file') as File | null
  const manualFile = formData.get('manual_file') as File | null

  let photo_url: string | null = equipment.photo_url
  let manual_url: string | null = equipment.manual_url

  if (photoFile && photoFile.size > 0) {
    try {
      photo_url = await saveImageUpload(photoFile, 'equipments', 5 * 1024 * 1024)
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Erro no upload da foto.' }
    }
  }

  if (manualFile && manualFile.size > 0) {
    if (manualFile.size > 10 * 1024 * 1024) {
      return { error: 'O manual deve ter no máximo 10 MB.' }
    }
    const buffer = Buffer.from(await manualFile.arrayBuffer())
    // Confere a assinatura "%PDF" no início do arquivo, não só o Content-Type.
    if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
      return { error: 'O manual deve ser um arquivo PDF válido.' }
    }
    const filename = `${crypto.randomUUID()}.pdf`
    manual_url = await saveUpload('equipments', filename, buffer, 'application/pdf')
  }

  await prisma.equipment.updateMany({
    where: { id: equipamentoId, tenant_id: (await getTenantId()) },
    data: {
      name:                      parsed.data.name,
      category_id:               parsed.data.category_id,
      serial_number:             parsed.data.serial_number,
      location:                  parsed.data.location,
      installation_date:         parsed.data.installation_date
        ? new Date(parsed.data.installation_date)
        : null,
      preventive_frequency_days: parsed.data.preventive_frequency_days,
      manufacturer:              parsed.data.manufacturer,
      model_name:                parsed.data.model_name,
      status:                    parsed.data.status,
      responsible_id:            parsed.data.responsible_id,
      photo_url,
      manual_url,
    },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  revalidatePath('/gestor/equipamentos')
  revalidatePath(`/gestor/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Equipamento: toggle ativo ────────────────────────────────────────────────

export async function toggleAtivoEquipamento(
  equipamentoId: string,
): Promise<{ error?: string }> {
  await requirePermission('equipment.maintain')

  const equipment = await prisma.equipment.findFirst({ where: { id: equipamentoId , tenant_id: (await getTenantId()) },
    select: { is_active: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.updateMany({ where: { id: equipamentoId , tenant_id: (await getTenantId()) }, data:  { is_active: !equipment.is_active },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  revalidatePath('/gestor/equipamentos')
  revalidatePath(`/gestor/equipamentos/${equipamentoId}`)
  return {}
}

// ─── Preventiva: concluir e agendar a próxima ─────────────────────────────────

export async function concluirPreventiva(
  preventivaId: string,
): Promise<{ error?: string }> {
  const ctx = await requirePermission('equipment.maintain')

  const userId = ctx.userId

  const preventiva = await prisma.preventiveMaintenance.findFirst({ where: { id: preventivaId , tenant_id: (await getTenantId()) },
    include: { equipment: { select: { id: true, preventive_frequency_days: true } } },
  })
  if (!preventiva)                    return { error: 'Preventiva não encontrada.' }
  if (preventiva.status === 'COMPLETED') return { error: 'Preventiva já concluída.' }

  const completedDate = new Date()
  const nextScheduledDate = addDays(completedDate, preventiva.equipment.preventive_frequency_days)

  await prisma.$transaction(async (tx) => {
    await tx.preventiveMaintenance.updateMany({ where: { id: preventivaId , tenant_id: (await getTenantId()) }, data: {
        status:         'COMPLETED',
        completed_date: completedDate,
        completed_by:   userId,
      },
    })

    // Log a manutenção preventina concluída no histórico
    await tx.maintenanceLog.create({
      data: {
        tenant_id:      (await getTenantId()),
        equipment_id:   preventiva.equipment.id,
        type:           'PREVENTIVE',
        description:    preventiva.notes || 'Manutenção preventiva periódica concluída.',
        performed_by:   ctx.name || ctx.email,
      }
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      (await getTenantId()),
        equipment_id:   preventiva.equipment.id,
        scheduled_date: nextScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${preventiva.equipment.id}`)
  revalidatePath('/gestor/equipamentos')
  revalidatePath(`/gestor/equipamentos/${preventiva.equipment.id}`)
  return {}
}

// ─── Corretiva: registrar ─────────────────────────────────────────────────────

export async function registrarCorretiva(
  equipamentoId: string,
  _prev: CorretivaFormState,
  formData: FormData,
): Promise<CorretivaFormState> {
  const ctx = await requirePermission('equipment.maintain')

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

  const userId = ctx.userId

  const erroPosse = await checkOwnership(await getTenantId(), [
    { model: 'equipment', id: equipamentoId, message: 'Equipamento não encontrado.' },
  ])
  if (erroPosse) return { error: erroPosse }

  // Calcular data limite da OS baseada na prioridade
  const hoursMap = { LOW: 72, MEDIUM: 48, HIGH: 24, CRITICAL: 12 }
  const priorityVal = parsed.data.priority as keyof typeof hoursMap
  const deadlineHours = hoursMap[priorityVal] || 48
  const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000)

  await prisma.correctiveMaintenance.create({
    data: {
      tenant_id:      (await getTenantId()),
      equipment_id:   equipamentoId,
      description:    parsed.data.description,
      responsible_id: userId,
      priority:       parsed.data.priority,
      start_date:     new Date(parsed.data.start_date),
      status:         'OPEN', // Começa aberta como Ordens de Serviço
      notes:          parsed.data.notes,
      estimated_cost: parsed.data.estimated_cost ?? undefined,
      deadline,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  revalidatePath(`/gestor/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Corretiva: concluir ou cancelar ─────────────────────────────────────────

const STATUS_CORRETIVA = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'CANCELLED']

export async function atualizarStatusCorretiva(
  corretivaId: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED' | 'CANCELLED',
  payload?: {
    actual_cost?: string
    notes?: string
  }
): Promise<{ error?: string }> {
  const ctx = await requirePermission('equipment.maintain')

  const userId = ctx.userId

  // T-21: o tipo do TypeScript não vale em tempo de execução; a action é chamada pelo cliente
  if (!STATUS_CORRETIVA.includes(status)) return { error: 'Status inválido.' }
  if (payload?.notes && payload.notes.length > 2000) {
    return { error: 'Nota muito longa (máximo 2000 caracteres).' }
  }

  const tenantId = await getTenantId()

  // T-16: custo digitado em português ("1.500,00"); antes ia cru para o Decimal e quebrava
  let actualCost: string | undefined
  if (payload?.actual_cost) {
    const n = parseNumeroBR(payload.actual_cost)
    if (n === INVALIDO || (n !== null && n < 0)) return { error: 'Custo inválido. Use, por exemplo, 1.500,00 ou 1500.00.' }
    actualCost = n === null ? undefined : String(n)
  }

  const corretiva = await prisma.correctiveMaintenance.findFirst({
    where: { id: corretivaId, tenant_id: tenantId },
    select: { status: true, equipment_id: true, description: true, estimated_cost: true, responsible_id: true },
  })
  if (!corretiva) return { error: 'Corretiva não encontrada.' }

  // Restrição de papéis
  if (status === 'VALIDATED' && permissionError(ctx, 'maintenance.validate')) {
    return { error: 'Apenas Gestores podem validar Ordens de Serviço concluídas.' }
  }

  await prisma.$transaction(async (tx) => {
    // Atualiza corretiva
    await tx.correctiveMaintenance.updateMany({
      where: { id: corretivaId, tenant_id: tenantId },
      data: {
        status,
        end_date: (status === 'COMPLETED' || status === 'VALIDATED') ? new Date() : undefined,
        actual_cost: actualCost,
        notes: payload?.notes ? payload.notes : undefined,
      },
    })

    // Se validado, cria log de manutenção automática
    if (status === 'VALIDATED') {
      const respUser = await tx.user.findFirst({
        where: { id: corretiva.responsible_id, tenant_id: tenantId },
        select: { name: true }
      })
      await tx.maintenanceLog.create({
        data: {
          tenant_id:      tenantId,
          equipment_id:   corretiva.equipment_id,
          type:           'CORRECTIVE',
          description:    `OS Concluída: ${corretiva.description}` + (payload?.notes ? ` (Resolução: ${payload.notes})` : ''),
          cost:           actualCost ?? (corretiva.estimated_cost ? String(corretiva.estimated_cost) : null),
          performed_by:   respUser?.name || 'Responsável',
        }
      })
    }
  })

  revalidatePath(`/tecnico/equipamentos/${corretiva.equipment_id}`)
  revalidatePath(`/gestor/equipamentos/${corretiva.equipment_id}`)
  revalidatePath('/manutencao/dashboard')
  return {}
}
