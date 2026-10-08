'use server'

import { requirePermission } from '@/server/auth/guards'
import { reabrirOcorrencia, resolverOcorrencia } from '@/server/occurrences/resolve'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { saveImageUpload } from '@/lib/storage'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'
import { redirect } from 'next/navigation'
import { sendWhatsAppAlert } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'
import { handleNewOccurrence } from '@/lib/occurrences'

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB


// ─── Schemas ──────────────────────────────────────────────────────────────────

const OcorrenciaSchema = z.object({
  description: z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    message: 'Selecione a severidade'
  }),
  category: z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(1, 'Selecione a categoria'),
  type: z.enum(['OPERATIONAL', 'LABORATORY', 'EQUIPMENT', 'ENVIRONMENTAL', 'SAFETY'], {
    message: 'Selecione o tipo de ocorrência'
  }),
  collection_point_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').optional().or(z.literal('')),
  immediate_action: z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').optional().nullable(),
}).refine(data => {
  if ((data.severity === 'HIGH' || data.severity === 'CRITICAL') && (!data.immediate_action || data.immediate_action.trim().length === 0)) {
    return false
  }
  return true
}, {
  message: 'Ação imediata é obrigatória para severidades Alta ou Crítica',
  path: ['immediate_action']
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type OcorrenciaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar ocorrência ─────────────────────────────────────────────────────

export async function registrarOcorrencia(
  _prev: OcorrenciaFormState,
  formData: FormData,
): Promise<OcorrenciaFormState> {
  const ctx = await requirePermission('occurrence.create')

  const parsed = OcorrenciaSchema.safeParse({
    description: formData.get('description'),
    severity:    formData.get('severity'),
    category:    formData.get('category'),
    type:        formData.get('type'),
    collection_point_id: formData.get('collection_point_id') || undefined,
    immediate_action: formData.get('immediate_action'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

  // Prazo calculado a partir da configuração de severidade
  const tenantId = await getTenantId()

  const erroPosse = await checkOwnership(tenantId, [
    { model: 'collectionPoint', id: parsed.data.collection_point_id, optional: true },
  ])
  if (erroPosse) return { error: erroPosse }
  const severityDefault = await prisma.occurrenceSeverityDefault.findUnique({
    where: { tenant_id_severity: { tenant_id: tenantId, severity: parsed.data.severity } },
  })
  if (!severityDefault) return { error: 'Configuração de prazo não encontrada. Contate o Gestor.' }

  const deadline = new Date(Date.now() + severityDefault.deadline_hours * 60 * 60 * 1000)

  // Trata fotos (até 3)
  const files = (formData.getAll('photos') as File[]).filter((f) => f.size > 0)
  if (files.length > 3) {
    return { error: 'Limite máximo de 3 fotos excedido.' }
  }

  type PhotoPayload = {
    filename:      string
    original_name: string
    mime_type:     string
    size_bytes:    number
  }
  const photoPayloads: PhotoPayload[] = []

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: `Formato inválido para ${file.name}. Use JPG, PNG ou WEBP.` }
    }
    let stored: string
    try {
      stored = await saveImageUpload(file, 'occurrences', MAX_FILE_BYTES)
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : `Erro no upload de ${file.name}` }
    }

    photoPayloads.push({
      filename: stored,
      original_name: file.name,
      mime_type:     file.type,
      size_bytes:    file.size,
    })
  }

  let postCommitHooks: Array<() => Promise<void>> = []
  // Cria ocorrência (+ fotos + audit) em transação atômica
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.create({
      data: {
        tenant_id:   (await getTenantId()),
        description: parsed.data.description,
        category:    parsed.data.category,
        type:        parsed.data.type,
        severity:    parsed.data.severity,
        status:      'OPEN',
        deadline,
        reported_by: userId,
        collection_point_id: parsed.data.collection_point_id || null,
        immediate_action: parsed.data.immediate_action || null,
      },
    })
    
    const hook = await handleNewOccurrence(tx, occurrence)
    if (hook) postCommitHooks.push(hook)

    if (photoPayloads.length > 0) {
      await tx.occurrencePhoto.createMany({
        data: photoPayloads.map(p => ({
          tenant_id:     ctx.tenantId,
          occurrence_id: occurrence.id,
          filename:      p.filename,
          original_name: p.original_name,
          mime_type:     p.mime_type,
          size_bytes:    p.size_bytes,
          uploaded_by:   userId,
        }))
      })
    }

    await logAudit(tx, {
      tenantId: (await getTenantId()),
      userId,
      action:    'CREATE',
      tableName: 'occurrences',
      recordId:  occurrence.id,
      after:     {
        description: parsed.data.description,
        severity: parsed.data.severity,
        status: 'OPEN',
        deadline,
        type: parsed.data.type,
        immediate_action: parsed.data.immediate_action
      },
    })
  })

  for (const hook of postCommitHooks) {
    await hook().catch(err => console.error('Error in postCommitHook:', err))
  }

  // Disparo de WhatsApp para gestores se for CRÍTICA ou ALTA
  if (parsed.data.severity === 'CRITICAL' || parsed.data.severity === 'HIGH') {
    // Buscar gerentes deste tenant que têm telefone cadastrado
    const managers = await prisma.user.findMany({
      where: {
        tenant_id: await getTenantId(),
        role: 'MANAGER',
        phone: { not: null }
      },
      select: { phone: true, name: true }
    })

    const point = parsed.data.collection_point_id 
      ? await prisma.collectionPoint.findFirst({ where: { id: parsed.data.collection_point_id, tenant_id: tenantId }, select: { name: true } })
      : null

    const locationText = point ? `no local: ${point.name}` : ''
    const msg = `🚨 *Alerta Solentis*\nNova Ocorrência *${parsed.data.severity === 'CRITICAL' ? 'CRÍTICA' : 'ALTA'}* reportada ${locationText}\n\n*Descrição:* ${parsed.data.description}\n\nAcesse o painel para mais detalhes.`

    // Disparar assincronamente (fire-and-forget: usa o logger base, pois roda fora do escopo da requisição)
    Promise.all(managers.map(m => sendWhatsAppAlert(m.phone!, msg))).catch((err) =>
      logger.warn({ err, tenantId, component: 'ocorrencias' }, 'Falha ao enviar alerta WhatsApp aos gestores'),
    )
  }

  revalidatePath('/operador/ocorrencias')
  revalidatePath('/tecnico/ocorrencias')
  revalidatePath('/gestor/ocorrencias')
  return { success: true }
}

export async function addOccurrenceComment(occurrenceId: string, text: string) {
  const ctx = await requirePermission('occurrence.create')
  const tenantId = await getTenantId()
  const userId = ctx.userId

  if (!text || text.trim().length < 2) {
    throw new Error('Comentário deve ter pelo menos 2 caracteres.')
  }
  if (text.length > 2000) {
    throw new Error('Comentário muito longo (máximo 2000 caracteres).')
  }

  // Isolamento de tenant: confirma que a ocorrência pertence ao tenant do usuário
  // antes de gravar. A tabela occurrence_comments não tem tenant_id próprio, então
  // este check é a única barreira contra escrita cross-tenant (IDOR).
  const occ = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, tenant_id: tenantId },
    select: { id: true },
  })
  if (!occ) throw new Error('Ocorrência não encontrada.')

  await prisma.occurrenceComment.create({
    data: {
      occurrence_id: occurrenceId,
      user_id: userId,
      text: text.trim(),
    }
  })

  // Log audit
  await prisma.$transaction(async (tx) => {
    await logAudit(tx, {
      tenantId,
      userId,
      action: 'UPDATE',
      tableName: 'occurrences',
      recordId: occurrenceId,
      after: { comment: text.trim() }
    })
  })

  revalidatePath(`/operador/ocorrencias/${occurrenceId}`)
  revalidatePath(`/tecnico/ocorrencias/${occurrenceId}`)
  revalidatePath(`/gestor/ocorrencias/${occurrenceId}`)
}

export async function updateOccurrenceStatus(
  occurrenceId: string,
  newStatus: string,
  notes?: string
): Promise<{ error?: string }> {
  const ctx = await requirePermission('occurrence.move')

  const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED']
  if (!validStatuses.includes(newStatus)) {
    return { error: 'Status inválido.' }
  }

  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, tenant_id: ctx.tenantId },
    select: { status: true },
  })
  if (!occurrence) return { error: 'Ocorrência não encontrada.' }
  if (occurrence.status === newStatus) return {}

  if (newStatus === 'RESOLVED') {
    // Arrastar para "Resolvida" é resolver: mesma permissão e mesmas regras do botão
    // (ação descrita obrigatória, responsável e data/hora na auditoria). T-20.
    const permCtx = await requirePermission('occurrence.resolve')
    const r = await resolverOcorrencia(permCtx, occurrenceId, notes, null, 'kanban')
    if (!r.ok) return { error: r.error }
  } else if (occurrence.status === 'RESOLVED') {
    // Reabrir também exige a permissão de resolver; a resolução anterior fica na auditoria
    const permCtx = await requirePermission('occurrence.resolve')
    if (!(await reabrirOcorrencia(permCtx, occurrenceId, newStatus))) return { error: 'A ocorrência mudou enquanto você arrastava. Atualize a tela.' }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.occurrence.updateMany({ where: { id: occurrenceId, tenant_id: ctx.tenantId }, data: { status: newStatus } })
      await logAudit(tx, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        tableName: 'occurrences',
        recordId: occurrenceId,
        before: { status: occurrence.status },
        after: { status: newStatus },
      })
    })
  }

  for (const area of ['operador', 'tecnico', 'gestor']) {
    revalidatePath(`/${area}/ocorrencias`)
    revalidatePath(`/${area}/ocorrencias/${occurrenceId}`)
  }
  return {}
}

