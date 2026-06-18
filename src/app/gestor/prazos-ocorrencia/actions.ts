'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
  return session
}

const PrazosSchema = z.object({
  CRITICAL: z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  HIGH:     z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  MEDIUM:   z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  LOW:      z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
})

export type PrazosFormState = {
  error?:   string
  success?: boolean
}

export async function atualizarPrazos(
  _prev: PrazosFormState,
  formData: FormData,
): Promise<PrazosFormState> {
  const session = await requireManager()

  const parsed = PrazosSchema.safeParse({
    CRITICAL: formData.get('deadline_CRITICAL'),
    HIGH:     formData.get('deadline_HIGH'),
    MEDIUM:   formData.get('deadline_MEDIUM'),
    LOW:      formData.get('deadline_LOW'),
  })
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { error: first ?? 'Valores inválidos.' }
  }

  // Resolver o ID do usuário logado para updated_by
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })
  if (!user) return { error: 'Sessão inválida.' }

  await Promise.all(
    SEVERITIES.map((severity) =>
      prisma.occurrenceSeverityDefault.update({
        where: { severity },
        data:  { deadline_hours: parsed.data[severity], updated_by: user.id },
      }),
    ),
  )

  revalidatePath('/gestor/prazos-ocorrencia')
  return { success: true }
}
