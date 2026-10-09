'use server'

import { requirePermission } from '@/server/auth/guards'
import { revalidatePath } from 'next/cache'
import { evidenciaDoForm, resolverOcorrencia as resolverComRegistro } from '@/server/occurrences/resolve'

export type ResolucaoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Resolver ocorrência ──────────────────────────────────────────────────────
// Usado pelas telas de detalhe do operador, do técnico e do gestor. As regras
// (ação obrigatória, evidência opcional, auditoria, gravação única) ficam em
// src/server/occurrences/resolve.ts — o mesmo caminho do kanban.

export async function resolverOcorrencia(
  ocorrenciaId: string,
  _prev: ResolucaoFormState,
  formData: FormData,
): Promise<ResolucaoFormState> {
  const ctx = await requirePermission('occurrence.resolve')

  const r = await resolverComRegistro(ctx, ocorrenciaId, formData.get('resolution_notes'), evidenciaDoForm(formData), 'tela')
  if (!r.ok) return r.field ? { fieldErrors: { [r.field]: [r.error] } } : { error: r.error }

  for (const area of ['operador', 'tecnico', 'gestor']) {
    revalidatePath(`/${area}/ocorrencias`)
    revalidatePath(`/${area}/ocorrencias/${ocorrenciaId}`)
  }
  return { success: true }
}
