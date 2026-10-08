'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const


const PrazosSchema = z.object({
  CRITICAL: numeroBR({ inteiro: true, min: 1, rotulo: 'O prazo (horas)', obrigatorio: 'Informe o prazo em horas' }),
  HIGH:     numeroBR({ inteiro: true, min: 1, rotulo: 'O prazo (horas)', obrigatorio: 'Informe o prazo em horas' }),
  MEDIUM:   numeroBR({ inteiro: true, min: 1, rotulo: 'O prazo (horas)', obrigatorio: 'Informe o prazo em horas' }),
  LOW:      numeroBR({ inteiro: true, min: 1, rotulo: 'O prazo (horas)', obrigatorio: 'Informe o prazo em horas' }),
})

export type PrazosFormState = {
  error?:   string
  success?: boolean
}

export async function atualizarPrazos(
  _prev: PrazosFormState,
  formData: FormData,
): Promise<PrazosFormState> {
  const ctx = await requirePermission('config.manage')

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
  const userId = ctx.userId

  const tid = await getTenantId()
  await Promise.all(
    SEVERITIES.map((severity) =>
      prisma.occurrenceSeverityDefault.upsert({
        where:  { tenant_id_severity: { tenant_id: tid, severity } },
        update: { deadline_hours: parsed.data[severity], updated_by: userId },
        create: { tenant_id: tid, severity, deadline_hours: parsed.data[severity], updated_by: userId },
      }),
    ),
  )

  revalidatePath('/gestor/prazos-ocorrencia')
  return { success: true }
}
