'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
}

const TurnoSchema = z.object({
  name:                     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  start_time:               z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end_time:                 z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  crosses_midnight:         z.preprocess((v) => v === 'on', z.boolean()),
  handover_timeout_minutes: z.preprocess(
    (v) => parseInt(String(v), 10),
    z.number().int().min(30, 'Mínimo 30 minutos').max(480, 'Máximo 480 minutos (8h)'),
  ),
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
  await requireManager()

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

  await prisma.shift.create({
    data: {
      tenant_id:                (await getTenantId()),
      name:                     parsed.data.name,
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
  await requireManager()

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

  await prisma.shift.updateMany({ where: { id: turnoId , tenant_id: (await getTenantId()) }, data: {
      name:                     parsed.data.name,
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
  await requireManager()
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { is_active: true } })
  if (!turno) return { error: 'Turno não encontrado.' }
  await prisma.shift.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data: { is_active: !turno.is_active } })
  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${id}`)
  return {}
}
