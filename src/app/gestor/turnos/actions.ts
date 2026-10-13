'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertOwned } from '@/lib/ownership'
import { logAudit } from '@/lib/audit'



const TurnoSchema = z.object({
  name:                     z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  start_time:               z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end_time:                 z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  crosses_midnight:         z.preprocess((v) => v === 'on', z.boolean()),
  handover_timeout_minutes: numeroBR({ inteiro: true, min: 30, max: 480, rotulo: 'O tempo de passagem (min)', obrigatorio: 'Informe o tempo de passagem em minutos' }),
})

export type TurnoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const ctx = await requirePermission('shift.manage')

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const nome = parsed.data.name.trim()

  // Impede turnos ativos com nome duplicado (case-insensitive) no mesmo tenant
  const duplicado = await prisma.shift.findFirst({
    where: {
      tenant_id: ctx.tenantId,
      is_active: true,
      name:      { equals: nome, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (duplicado) {
    return { error: `Já existe um turno chamado '${nome}'. Use um nome diferente ou edite o turno existente.` }
  }

  const turno = await prisma.shift.create({
    data: {
      tenant_id:                ctx.tenantId,
      name:                     nome,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
      is_active:                true,
    },
  })

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'CREATE',
    tableName: 'shifts', recordId: turno.id,
    after: { name: nome, start_time: parsed.data.start_time, end_time: parsed.data.end_time },
  })

  revalidatePath('/gestor/turnos')
  redirect('/gestor/turnos')
}

export async function editarTurno(
  turnoId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const ctx = await requirePermission('shift.manage')

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const nome = parsed.data.name.trim()

  // Impede colisão com OUTRO turno ativo do mesmo tenant (mesmo nome, case-insensitive)
  const duplicado = await prisma.shift.findFirst({
    where: {
      tenant_id: ctx.tenantId,
      is_active: true,
      name:      { equals: nome, mode: 'insensitive' },
      id:        { not: turnoId },
    },
    select: { id: true },
  })
  if (duplicado) {
    return { error: `Já existe um turno chamado '${nome}'. Use um nome diferente ou edite o turno existente.` }
  }

  const { count } = await prisma.shift.updateMany({ where: { id: turnoId , tenant_id: ctx.tenantId }, data: {
      name:                     nome,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
    },
  })
  if (count === 0) return { error: 'Turno não encontrado.' }

  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'shifts', recordId: turnoId,
    after: { name: nome, start_time: parsed.data.start_time, end_time: parsed.data.end_time },
  })

  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${turnoId}`)
  return { success: true }
}

export async function toggleAtivoTurno(id: string): Promise<{ error?: string }> {
  const ctx = await requirePermission('shift.manage')
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: ctx.tenantId }, select: { is_active: true } })
  if (!turno) return { error: 'Turno não encontrado.' }
  await prisma.shift.updateMany({ where: { id, tenant_id: ctx.tenantId }, data: { is_active: !turno.is_active } })
  await logAudit(prisma, {
    tenantId: ctx.tenantId, userId: ctx.userId, action: 'UPDATE',
    tableName: 'shifts', recordId: id,
    before: { is_active: turno.is_active }, after: { is_active: !turno.is_active },
  })
  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${id}`)
  return {}
}

export async function toggleDaySchedule(shiftId: string, days_of_week: number[]) {
  const ctx = await requirePermission('shift.manage')
  const tenant_id = ctx.tenantId
  await assertOwned(tenant_id, { model: 'shift', id: shiftId, message: 'Turno não encontrado.' })

  const schedule = await prisma.shiftSchedule.findFirst({
    where: { shift_id: shiftId, tenant_id }
  })

  let scheduleId: string
  let acao: 'CREATE' | 'UPDATE'
  if (schedule) {
    // @tenant-checked: schedule buscado por tenant_id logo acima.
    await prisma.shiftSchedule.update({
      where: { id: schedule.id },
      data: { days_of_week }
    })
    scheduleId = schedule.id
    acao = 'UPDATE'
  } else {
    const criado = await prisma.shiftSchedule.create({
      data: {
        tenant_id,
        shift_id: shiftId,
        days_of_week,
        is_active: true
      }
    })
    scheduleId = criado.id
    acao = 'CREATE'
  }

  await logAudit(prisma, {
    tenantId: tenant_id, userId: ctx.userId, action: acao,
    tableName: 'shift_schedules', recordId: scheduleId,
    after: { shift_id: shiftId, days_of_week },
  })

  revalidatePath(`/gestor/turnos/${shiftId}`)
}
