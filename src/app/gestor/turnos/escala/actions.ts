'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'
import { assertOwned } from '@/lib/ownership'
import { normalizarData } from '@/lib/shift-utils'


export async function saveShiftScale(
  operatorId: string,
  shiftId: string,
  dateStr: string,
  actionType: 'assign' | 'remove'
) {
  await requirePermission('shift.manage')
  const tenantId = await getTenantId()
  const targetDate = normalizarData(new Date(dateStr + 'T00:00:00'))

  if (actionType === 'remove') {
    await prisma.shiftScale.deleteMany({
      where: {
        tenant_id: tenantId,
        shift_id: shiftId,
        date: targetDate,
        operator_id: operatorId,
      },
    })
  } else {
    await assertOwned(tenantId, { model: 'shift', id: shiftId, message: 'Turno não encontrado.' })

    // Check if operator exists and is active
    const operator = await prisma.user.findFirst({
      where: { id: operatorId, tenant_id: tenantId, is_active: true }
    })
    if (!operator) throw new Error('Operador não encontrado ou inativo.')

    // Assign operator to shift
    await prisma.shiftScale.upsert({
      where: {
        tenant_id_date_shift_id_operator_id: {
          tenant_id: tenantId,
          date: targetDate,
          shift_id: shiftId,
          operator_id: operatorId,
        }
      },
      update: {},
      create: {
        tenant_id: tenantId,
        date: targetDate,
        shift_id: shiftId,
        operator_id: operatorId,
      }
    })
  }

  revalidatePath('/gestor/turnos/escala')
  revalidatePath('/operador/turnos/escala')
  revalidatePath('/gestor/dashboard')
  revalidatePath('/operador/dashboard')
}

export async function toggleMaintenanceDay(dateStr: string, description?: string) {
  const ctx = await requirePermission('shift.manage')
  const tenantId = await getTenantId()
  const targetDate = normalizarData(new Date(dateStr + 'T00:00:00'))

  const existing = await prisma.maintenanceDay.findUnique({
    where: { tenant_id_date: { tenant_id: tenantId, date: targetDate } }
  })

  if (existing) {
    // @tenant-checked: existing buscado pela PK composta tenant_id_date acima.
    await prisma.maintenanceDay.delete({
      where: { id: existing.id }
    })
  } else {
    await prisma.maintenanceDay.create({
      data: {
        tenant_id: tenantId,
        date: targetDate,
        description: description || 'Manutenção Programada ETE',
      }
    })
  }

  revalidatePath('/gestor/turnos/escala')
  revalidatePath('/operador/turnos/escala')
  revalidatePath('/gestor/dashboard')
  revalidatePath('/operador/dashboard')
}

export async function addShiftTask(
  dateStr: string,
  shiftId: string,
  title: string,
  description?: string,
  assignedToId?: string
) {
  const ctx = await requirePermission('shift.manage')
  const tenantId = await getTenantId()
  const targetDate = normalizarData(new Date(dateStr + 'T00:00:00'))

  const managerUser = { id: ctx.userId }

  // Turno e operador vêm do cliente: precisam ser desta planta (T-05)
  await assertOwned(tenantId, [
    { model: 'shift', id: shiftId, message: 'Turno não encontrado.' },
    { model: 'user', id: assignedToId, optional: true, where: { is_active: true }, message: 'Operador não encontrado ou inativo.' },
  ])

  // Find or create ShiftInstance with SCHEDULED status
  let instance = await prisma.shiftInstance.findFirst({
    where: {
      tenant_id: tenantId,
      shift_id: shiftId,
      date: targetDate,
    }
  })

  if (!instance) {
    // We create the instance using a fallback opened_by (e.g. either the assigned operator or the manager)
    let openedById = managerUser.id
    if (assignedToId) {
      openedById = assignedToId
    } else {
      // Find operator assigned in ShiftScale for this shift/date
      const scale = await prisma.shiftScale.findFirst({
        where: { tenant_id: tenantId, shift_id: shiftId, date: targetDate }
      })
      if (scale) {
        openedById = scale.operator_id
      }
    }

    instance = await prisma.shiftInstance.create({
      data: {
        tenant_id: tenantId,
        shift_id: shiftId,
        date: targetDate,
        opened_by: openedById,
        status: 'SCHEDULED',
      }
    })
  }

  // Create the ShiftTask
  await prisma.shiftTask.create({
    data: {
      tenant_id: tenantId,
      shift_instance_id: instance.id,
      title,
      description: description || '',
      assigned_to_id: assignedToId || null,
      created_by: managerUser.id,
      status: 'PENDING',
    }
  })

  revalidatePath('/gestor/turnos/escala')
  revalidatePath('/operador/turnos/escala')
  revalidatePath('/operador/turnos')
}

export async function deleteShiftTask(taskId: string) {
  await requirePermission('shift.manage')
  const tenantId = await getTenantId()

  const task = await prisma.shiftTask.findFirst({
    where: { id: taskId, tenant_id: tenantId }
  })
  if (!task) throw new Error('Tarefa não encontrada.')

  // @tenant-checked: task validada por tenant_id no findFirst acima.
  await prisma.shiftTask.delete({
    where: { id: taskId }
  })

  revalidatePath('/gestor/turnos/escala')
  revalidatePath('/operador/turnos/escala')
  revalidatePath('/operador/turnos')
}
