'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBROpcional } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId } from '@/lib/tenant'
import { localInputToUTC } from '@/lib/date-utils'
import { saveImageUpload } from '@/lib/storage'
import { handleNewOccurrence } from '@/lib/occurrences'
import { getLogger } from '@/lib/logger'

const MAX_IMG_BYTES = 5 * 1024 * 1024


function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002'
}


const LeituraSchema = z
  .object({
    collection_point_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione o ponto de coleta'),
    parameter_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').nullable(),
    ),
    // T-16: aceita 7,2 e 7.2; mensagens em português
    value: numeroBROpcional({ rotulo: 'O valor medido' }),
    unit: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').nullable(),
    ),
    notes: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres').nullable(),
    ),
    recorded_at: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, 'Informe a data/hora da leitura'),
    // T-15: id gerado no aparelho; o mesmo id enviado de novo não duplica a leitura
    client_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').regex(/^[A-Za-z0-9-]{8,64}$/, 'Identificador inválido').nullable(),
    ),
  })
  .refine((d) => d.parameter_id === null || d.value !== null, {
    message: 'Informe o valor medido',
    path: ['value'],
  })

export type LeituraFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  warning?: string
  /** T-15: a leitura com este client_id já tinha sido registrada (reenvio). */
  duplicate?: boolean
}

// ─── Registrar leitura ────────────────────────────────────────────────────────

export async function registrarLeitura(
  _prev: LeituraFormState,
  formData: FormData,
): Promise<LeituraFormState> {
  const ctx = await requirePermission('reading.create')

  const parsed = LeituraSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    unit:                formData.get('unit'),
    notes:               formData.get('notes'),
    recorded_at:         formData.get('recorded_at'),
    client_id:           formData.get('client_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

  // T-15: reenvio (fila offline, duplo toque, resposta perdida) → não duplica
  const clientId = parsed.data.client_id
  if (clientId) {
    const existente = await prisma.reading.findUnique({
      where: { tenant_id_client_id: { tenant_id: await getTenantId(), client_id: clientId } },
      select: { id: true },
    })
    if (existente) return { success: true, duplicate: true }
  }

  let isNonConformant: boolean | null = null
  let unit = parsed.data.unit
  let paramName: string | null = null
  let pointName: string | null = null

  if (parsed.data.parameter_id) {
    const [param, collectionPoint] = await Promise.all([
      prisma.qualityParameter.findFirst({
        where:  { id: parsed.data.parameter_id, tenant_id: await getTenantId() },
        select: { name: true, min_limit: true, max_limit: true, unit: true },
      }),
      prisma.collectionPoint.findFirst({
        where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
        select: { id: true, name: true },
      })
    ])

    if (!collectionPoint) {
      return { error: 'Ponto de coleta inválido ou não autorizado.' }
    }

    if (param) {
      // Copia a unidade do parâmetro quando o formulário não enviou uma
      unit = unit ?? param.unit
      paramName = param.name
      pointName = collectionPoint.name
      isNonConformant = calcularNaoConformidade(
        parsed.data.value,
        param.min_limit,
        param.max_limit,
      )
    } else {
      return { error: 'Parâmetro inválido ou não autorizado.' }
    }
  } else {
    // If no parameter is provided, we still need to validate the collection point
    const collectionPoint = await prisma.collectionPoint.findFirst({
      where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
      select: { id: true },
    })
    if (!collectionPoint) return { error: 'Ponto de coleta inválido ou não autorizado.' }
  }

  // A leitura entra no turno aberto POR QUEM REGISTROU. Sem turno próprio, fica
  // sem vínculo (shift_instance_id = null). Antes (P-16) caía em qualquer turno
  // aberto da planta — o de outro operador — e entrava na contagem da passagem
  // dele. Decisão da T-18: permitir sem vínculo em vez de bloquear (o operador
  // em campo não perde a medição; o técnico/gestor também registra leituras).
  const activeInstance = await prisma.shiftInstance.findFirst({
    where: { tenant_id: await getTenantId(), opened_by: userId, status: 'OPEN' },
    select: { id: true },
    orderBy: { opened_at: 'desc' },
  })

  // A foto é OPCIONAL: se o upload falhar (Blob fora do ar/não configurado,
  // arquivo inválido), a leitura NÃO se perde — salva sem foto e avisa que dá
  // para anexar depois. Nenhum erro cru (ENOENT/stack) chega ao formulário.
  let photoFilename: string | null = null
  let photoWarning: string | null = null
  const photoFile = formData.get('photo') as File | null
  if (photoFile && photoFile.size > 0) {
    try {
      photoFilename = await saveImageUpload(photoFile, 'readings', MAX_IMG_BYTES, await getTenantId())
    } catch (err: unknown) {
      photoFilename = null
      photoWarning = 'Não deu para enviar a foto. A leitura foi salva; você pode anexar depois pelo histórico.'
      const log = await getLogger({ action: 'registrarLeitura' })
      log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Falha no upload da foto da leitura (leitura salva sem foto)',
      )
    }
  }

  let postCommitHooks: Array<() => Promise<void>> = []
  try {
    await prisma.$transaction(async (tx) => {
      const reading = await tx.reading.create({
        data: {
          tenant_id:           (await getTenantId()),
          collection_point_id: parsed.data.collection_point_id,
          parameter_id:        parsed.data.parameter_id,
          shift_instance_id:   activeInstance?.id ?? null,
          value:               parsed.data.value,
          unit,
          notes:               parsed.data.notes,
          is_non_conformant:   isNonConformant,
          origin:              'MANUAL',
          photo_filename:      photoFilename,
          client_id:           clientId,
          recorded_by:         userId,
          recorded_at:         localInputToUTC(parsed.data.recorded_at),
        },
      })

      // Se estiver fora da faixa, abre automaticamente uma ocorrência
      if (isNonConformant && parsed.data.parameter_id) {
        const tenantId = await getTenantId()
        const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
          where: { tenant_id_severity: { tenant_id: tenantId, severity: 'HIGH' } }
        })
        const deadlineHours = defaultSeverity?.deadline_hours || 24
        const deadline = new Date()
        deadline.setHours(deadline.getHours() + deadlineHours)

        const occurrence = await tx.occurrence.create({
          data: {
            tenant_id:   tenantId,
            description: `Não Conformidade (${paramName}): Leitura registrada = ${parsed.data.value} ${unit ?? ''}. O valor está fora dos limites aceitáveis.`,
            severity:    'HIGH',
            status:      'OPEN',
            type:        'OPERATIONAL',
            deadline,
            reported_by: userId,
            collection_point_id: parsed.data.collection_point_id,
          }
        })
        const hook = await handleNewOccurrence(tx, occurrence)
        if (hook) postCommitHooks.push(hook)
      }
    })
  } catch (err) {
    // T-15: dois envios simultâneos do mesmo client_id — o índice único barra o
    // segundo; a leitura já existe, então para o aparelho isso é sucesso.
    if (clientId && isUniqueViolation(err)) return { success: true, duplicate: true }
    throw err
  }

  for (const hook of postCommitHooks) {
    await hook().catch(err => console.error('Error in postCommitHook:', err))
  }



  revalidatePath('/operador/leituras')
  revalidatePath('/operador/ocorrencias')
  revalidatePath('/operador/dashboard')
  revalidatePath('/tecnico/dashboard')
  revalidatePath('/gestor/dashboard')
  return { success: true, warning: photoWarning ?? undefined }
}
