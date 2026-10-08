'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'
import { assertOwned } from '@/lib/ownership'



const TurnoSchema = z.object({
  name:                     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  start_time:               z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end_time:                 z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
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
  await requirePermission('shift.manage')

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
      tenant_id: (await getTenantId()),
      is_active: true,
      name:      { equals: nome, mode: 'insensitive' },
    },
    select: { id: true },
  })
  if (duplicado) {
    return { error: `Já existe um turno chamado '${nome}'. Use um nome diferente ou edite o turno existente.` }
  }

  await prisma.shift.create({
    data: {
      tenant_id:                (await getTenantId()),
      name:                     nome,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
      is_active:                true,
    },
  })

  revalidatePath('/gestor/turnos')
  redirect('/gestor/turnos')
}

export async function editarTurno(
  turnoId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  await requirePermission('shift.manage')

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
      tenant_id: (await getTenantId()),
      is_active: true,
      name:      { equals: nome, mode: 'insensitive' },
      id:        { not: turnoId },
    },
    select: { id: true },
  })
  if (duplicado) {
    return { error: `Já existe um turno chamado '${nome}'. Use um nome diferente ou edite o turno existente.` }
  }

  await prisma.shift.updateMany({ where: { id: turnoId , tenant_id: (await getTenantId()) }, data: {
      name:                     nome,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
    },
  })

  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${turnoId}`)
  return { success: true }
}

export async function toggleAtivoTurno(id: string): Promise<{ error?: string }> {
  await requirePermission('shift.manage')
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { is_active: true } })
  if (!turno) return { error: 'Turno não encontrado.' }
  await prisma.shift.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data: { is_active: !turno.is_active } })
  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${id}`)
  return {}
}

export async function toggleDaySchedule(shiftId: string, days_of_week: number[]) {
  await requirePermission('shift.manage')
  const tenant_id = await getTenantId()
  await assertOwned(tenant_id, { model: 'shift', id: shiftId, message: 'Turno não encontrado.' })

  const schedule = await prisma.shiftSchedule.findFirst({
    where: { shift_id: shiftId, tenant_id }
  })

  if (schedule) {
    // @tenant-checked: schedule buscado por tenant_id logo acima.
    await prisma.shiftSchedule.update({
      where: { id: schedule.id },
      data: { days_of_week }
    })
  } else {
    await prisma.shiftSchedule.create({
      data: {
        tenant_id,
        shift_id: shiftId,
        days_of_week,
        is_active: true
      }
    })
  }

  revalidatePath(`/gestor/turnos/${shiftId}`)
}
