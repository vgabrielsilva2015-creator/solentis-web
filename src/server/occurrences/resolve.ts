/**
 * Resolver e reabrir ocorrência — caminho ÚNICO (T-20, decisão 2 do dono:
 * "toda resolução de ocorrência deve ficar registrada com responsável, data/hora
 * e, quando aplicável, ação/evidência da resolução").
 *
 * Antes havia três caminhos com regras diferentes:
 *  - tela do operador: aceitava nota vazia;
 *  - kanban: gravava "Resolvido via painel Kanban." se ninguém escrevesse nada;
 *  - tela do técnico/gestor: exigia 5 caracteres.
 * E resolver de novo uma ocorrência já resolvida trocava o responsável e a data.
 *
 * Agora: a ação tomada é obrigatória; foto de evidência é opcional; quem
 * resolveu e quando ficam na ocorrência e na auditoria; a resolução é gravada uma
 * vez só (segunda tentativa simultânea recebe "já encerrada"); reabrir limpa a
 * resolução atual e deixa a anterior registrada na auditoria.
 */
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { saveImageUpload } from '@/lib/storage'
import type { ActionCtx } from '@/server/auth/guards'
import { ResolucaoSchema } from '@/lib/occurrence-resolution'

const MAX_EVIDENCIA_BYTES = 5 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

export type ResultadoResolucao =
  | { ok: true; resolvedAt: Date }
  | { ok: false; error: string; field?: 'resolution_notes' | 'evidence' }

/** Lê a foto opcional do formulário (campo vazio do navegador vem como File de 0 bytes). */
export function evidenciaDoForm(formData: FormData | null | undefined): File | null {
  const f = formData?.get('evidence')
  return f instanceof File && f.size > 0 ? f : null
}

export async function resolverOcorrencia(
  ctx: ActionCtx,
  occurrenceId: string,
  notas: unknown,
  evidencia: File | null,
  origem: 'tela' | 'kanban',
): Promise<ResultadoResolucao> {
  const parsed = ResolucaoSchema.safeParse({ resolution_notes: notas ?? undefined })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, field: 'resolution_notes' }
  const notes = parsed.data.resolution_notes

  const atual = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, tenant_id: ctx.tenantId },
    select: { status: true },
  })
  if (!atual) return { ok: false, error: 'Ocorrência não encontrada.' }
  if (atual.status === 'RESOLVED') return { ok: false, error: 'Ocorrência já encerrada.' }

  // Foto antes da transação (upload não entra em transação de banco)
  let foto: { filename: string; original_name: string; mime_type: string; size_bytes: number } | null = null
  if (evidencia) {
    if (!TIPOS_FOTO.includes(evidencia.type)) return { ok: false, error: 'Evidência: use foto JPG, PNG ou WEBP.', field: 'evidence' }
    try {
      const filename = await saveImageUpload(evidencia, 'occurrences', MAX_EVIDENCIA_BYTES, ctx.tenantId)
      foto = { filename, original_name: evidencia.name, mime_type: evidencia.type, size_bytes: evidencia.size }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível salvar a foto.', field: 'evidence' }
    }
  }

  const resolvedAt = new Date()
  const gravou = await prisma.$transaction(async (tx) => {
    // Condição de status: a resolução é gravada uma vez só, mesmo com dois cliques simultâneos
    const r = await tx.occurrence.updateMany({
      where: { id: occurrenceId, tenant_id: ctx.tenantId, status: { not: 'RESOLVED' } },
      data: { status: 'RESOLVED', resolved_at: resolvedAt, resolved_by: ctx.userId, resolution_notes: notes },
    })
    if (r.count !== 1) return false
    if (foto) {
      await tx.occurrencePhoto.create({
        data: { tenant_id: ctx.tenantId, occurrence_id: occurrenceId, uploaded_by: ctx.userId, kind: 'RESOLUTION', ...foto },
      })
    }
    await logAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      tableName: 'occurrences',
      recordId: occurrenceId,
      before: { status: atual.status },
      after: {
        status: 'RESOLVED',
        resolved_by: ctx.userId,
        resolved_at: resolvedAt.toISOString(),
        resolution_notes: notes,
        evidencia: foto ? foto.original_name : null,
        via: origem,
      },
    })
    return true
  })
  return gravou ? { ok: true, resolvedAt } : { ok: false, error: 'Ocorrência já encerrada.' }
}

/**
 * Reabrir (tirar de "Resolvida" no kanban). A resolução atual sai da ocorrência,
 * mas fica inteira na auditoria (quem tinha resolvido, quando e o que fez).
 */
export async function reabrirOcorrencia(ctx: ActionCtx, occurrenceId: string, novoStatus: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.occurrence.findFirst({
      where: { id: occurrenceId, tenant_id: ctx.tenantId, status: 'RESOLVED' },
      select: { resolved_at: true, resolved_by: true, resolution_notes: true },
    })
    if (!atual) return false
    const r = await tx.occurrence.updateMany({
      where: { id: occurrenceId, tenant_id: ctx.tenantId, status: 'RESOLVED' },
      data: { status: novoStatus, resolved_at: null, resolved_by: null, resolution_notes: null },
    })
    if (r.count !== 1) return false
    await logAudit(tx, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      tableName: 'occurrences',
      recordId: occurrenceId,
      before: {
        status: 'RESOLVED',
        resolved_by: atual.resolved_by,
        resolved_at: atual.resolved_at?.toISOString() ?? null,
        resolution_notes: atual.resolution_notes,
      },
      after: { status: novoStatus, reaberta_por: ctx.userId },
    })
    return true
  })
}
