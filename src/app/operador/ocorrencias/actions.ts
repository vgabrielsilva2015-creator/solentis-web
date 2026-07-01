'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { saveUpload } from '@/lib/storage'
import { logAudit } from '@/lib/audit'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import { sendWhatsAppAlert } from '@/lib/whatsapp'
import { logger } from '@/lib/logger'

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireAuthenticated() {
  const session = await auth()
  if (!session || !['OPERATOR', 'TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    message: 'Selecione a severidade'
  }),
  category: z.string().min(1, 'Selecione a categoria'),
  type: z.enum(['OPERATIONAL', 'LABORATORY', 'EQUIPMENT', 'ENVIRONMENTAL', 'SAFETY'], {
    message: 'Selecione o tipo de ocorrência'
  }),
  collection_point_id: z.string().optional().or(z.literal('')),
  immediate_action: z.string().optional().nullable(),
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
  const session = await requireAuthenticated()

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

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  // Prazo calculado a partir da configuração de severidade
  const tenantId = await getTenantId()
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
    if (file.size > MAX_FILE_BYTES) {
      return { error: `Arquivo ${file.name} é muito grande. Máximo 5 MB.` }
    }

    const ext      = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await saveUpload('occurrences', filename, buffer, file.type)

    photoPayloads.push({
      filename: stored,
      original_name: file.name,
      mime_type:     file.type,
      size_bytes:    file.size,
    })
  }

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

    if (photoPayloads.length > 0) {
      await tx.occurrencePhoto.createMany({
        data: photoPayloads.map(p => ({
          tenant_id:     session.user.tenantId,
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

// ─── Resolver ocorrência ──────────────────────────────────────────────────────

export async function resolverOcorrencia(formData: FormData) {
  const session = await requireAuthenticated()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) throw new Error('Sessão inválida.')

  const occurrenceId = formData.get('id') as string
  const notes = formData.get('notes') as string

  if (!occurrenceId) throw new Error('ID não informado')

  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.findUnique({
      where: { id: occurrenceId, tenant_id: await getTenantId() },
    })
    if (!occurrence) throw new Error('Ocorrência não encontrada.')

    await tx.occurrence.update({
      where: { id: occurrenceId },
      data: {
        status: 'RESOLVED',
        resolved_at: new Date(),
        resolved_by: userId,
        resolution_notes: notes,
      },
    })

    await logAudit(tx, {
      tenantId: (await getTenantId()),
      userId,
      action: 'UPDATE',
      tableName: 'occurrences',
      recordId: occurrence.id,
      before: { status: occurrence.status },
      after: { status: 'RESOLVED', resolved_by: userId, resolution_notes: notes },
    })
  })

  revalidatePath('/operador/ocorrencias')
  revalidatePath('/tecnico/ocorrencias')
  revalidatePath('/gestor/ocorrencias')
  revalidatePath(`/operador/ocorrencias/${occurrenceId}`)
  redirect(`/operador/ocorrencias/${occurrenceId}`)
}

export async function addOccurrenceComment(occurrenceId: string, text: string) {
  const session = await requireAuthenticated()
  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) throw new Error('Sessão inválida.')

  if (!text || text.trim().length < 2) {
    throw new Error('Comentário deve ter pelo menos 2 caracteres.')
  }

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
) {
  const session = await requireAuthenticated()
  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) throw new Error('Sessão inválida.')

  const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED']
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Status inválido.')
  }

  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, tenant_id: tenantId }
  })
  if (!occurrence) throw new Error('Ocorrência não encontrada.')

  await prisma.$transaction(async (tx) => {
    const isResolving = newStatus === 'RESOLVED'
    await tx.occurrence.update({
      where: { id: occurrenceId },
      data: {
        status: newStatus,
        ...(isResolving ? {
          resolved_at: new Date(),
          resolved_by: userId,
          resolution_notes: notes || 'Resolvido via painel Kanban.',
        } : {})
      }
    })

    await logAudit(tx, {
      tenantId,
      userId,
      action: 'UPDATE',
      tableName: 'occurrences',
      recordId: occurrenceId,
      before: { status: occurrence.status },
      after: {
        status: newStatus,
        ...(isResolving ? { resolved_by: userId, resolution_notes: notes || 'Resolvido via painel Kanban.' } : {})
      }
    })
  })

  revalidatePath('/operador/ocorrencias')
  revalidatePath('/tecnico/ocorrencias')
  revalidatePath('/gestor/ocorrencias')
  revalidatePath(`/operador/ocorrencias/${occurrenceId}`)
  revalidatePath(`/tecnico/ocorrencias/${occurrenceId}`)
  revalidatePath(`/gestor/ocorrencias/${occurrenceId}`)
}

