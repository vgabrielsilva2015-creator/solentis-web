'use server'

import { requirePermission } from '@/server/auth/guards'
import { medir } from '@/lib/observability'
import { revalidatePath } from 'next/cache'
import { localInputToUTC } from '@/lib/date-utils'
import { saveImageUpload } from '@/lib/storage'
import { getLogger } from '@/lib/logger'
import { LeituraSchema } from '@/server/leituras/schema'
import { leituraJaRegistrada, resolverReferencias, gravarLeitura } from '@/server/leituras/service'

const MAX_IMG_BYTES = 5 * 1024 * 1024

export type LeituraFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  warning?: string
  /** T-15: a leitura com este client_id já tinha sido registrada (reenvio). */
  duplicate?: boolean
}

// T-25: as regras (idempotência, ponto/parâmetro do tenant, não conformidade, turno, ocorrência
// automática) estão em `src/server/leituras/service.ts`. Aqui: quem pode, validação, foto, telas.

/** A foto é OPCIONAL: se o upload falhar, a leitura NÃO se perde — salva sem foto e avisa. */
async function salvarFotoOpcional(formData: FormData, tenantId: string) {
  const arquivo = formData.get('photo') as File | null
  if (!arquivo || arquivo.size === 0) return { filename: null, warning: null }
  try {
    return { filename: await saveImageUpload(arquivo, 'readings', MAX_IMG_BYTES, tenantId), warning: null }
  } catch (err: unknown) {
    const log = await getLogger({ action: 'registrarLeitura' })
    log.warn({ err: err instanceof Error ? err.message : String(err) }, 'Falha no upload da foto da leitura (leitura salva sem foto)')
    return { filename: null, warning: 'Não deu para enviar a foto. A leitura foi salva; você pode anexar depois pelo histórico.' }
  }
}

async function registrarLeituraImpl(_prev: LeituraFormState, formData: FormData): Promise<LeituraFormState> {
  const ctx = await requirePermission('reading.create')

  const parsed = LeituraSchema.safeParse(Object.fromEntries(
    ['collection_point_id', 'parameter_id', 'value', 'unit', 'notes', 'recorded_at', 'client_id'].map((k) => [k, formData.get(k)]),
  ))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  const d = parsed.data

  if (await leituraJaRegistrada(ctx.tenantId, d.client_id)) return { success: true, duplicate: true }

  const ref = await resolverReferencias({
    tenantId: ctx.tenantId, collectionPointId: d.collection_point_id, parameterId: d.parameter_id, value: d.value, unit: d.unit,
  })
  if (!ref.ok) return { error: ref.error }

  const foto = await salvarFotoOpcional(formData, ctx.tenantId)
  const r = await gravarLeitura({
    tenantId: ctx.tenantId, userId: ctx.userId, collectionPointId: d.collection_point_id, parameterId: d.parameter_id,
    value: d.value, unit: ref.unit, notes: d.notes, recordedAt: localInputToUTC(d.recorded_at), clientId: d.client_id,
    photoFilename: foto.filename, isNonConformant: ref.isNonConformant, paramName: ref.paramName,
  })
  if (r.duplicate) return { success: true, duplicate: true }

  for (const p of ['/operador/leituras', '/operador/ocorrencias', '/operador/dashboard', '/tecnico/dashboard', '/gestor/dashboard']) {
    revalidatePath(p)
  }
  return { success: true, warning: foto.warning ?? undefined }
}

// ─── T-30: medição de duração/erro (composição; o contrato das ações não muda) ───
export async function registrarLeitura(...args: Parameters<typeof registrarLeituraImpl>) {
  return medir('registrarLeitura', () => registrarLeituraImpl(...args))
}
