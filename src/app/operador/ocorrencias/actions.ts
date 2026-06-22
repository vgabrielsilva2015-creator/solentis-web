'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import { sendWhatsAppAlert } from '@/lib/whatsapp'

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireAuthenticated() {
  const session = await auth()
  if (!session || !['OPERATOR', 'TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a severidade',
  }),
  category: z.string().min(1, 'Selecione a categoria'),
  collection_point_id: z.string().optional().or(z.literal('')),
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
    collection_point_id: formData.get('collection_point_id') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  // Prazo calculado a partir da configuração de severidade
  const severityDefault = await prisma.occurrenceSeverityDefault.findUnique({
    where: { severity: parsed.data.severity },
  })
  if (!severityDefault) return { error: 'Configuração de prazo não encontrada. Contate o Gestor.' }

  const deadline = new Date(Date.now() + severityDefault.deadline_hours * 60 * 60 * 1000)

  // Trata foto (opcional)
  const photoFile = formData.get('photo') as File | null
  type PhotoPayload = {
    filename:      string
    original_name: string
    mime_type:     string
    size_bytes:    number
  }
  let photoPayload: PhotoPayload | null = null

  if (photoFile && photoFile.size > 0) {
    if (!ALLOWED_TYPES.includes(photoFile.type)) {
      return { fieldErrors: { photo: ['Formato inválido. Use JPG, PNG ou WEBP.'] } }
    }
    if (photoFile.size > MAX_FILE_BYTES) {
      return { fieldErrors: { photo: ['Arquivo muito grande. Máximo 5 MB.'] } }
    }

    const ext      = photoFile.type === 'image/jpeg' ? 'jpg' : photoFile.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`
    const dir      = path.join(process.cwd(), 'uploads', 'occurrences')

    await fs.mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    await fs.writeFile(path.join(dir, filename), buffer)

    photoPayload = {
      filename,
      original_name: photoFile.name,
      mime_type:     photoFile.type,
      size_bytes:    photoFile.size,
    }
  }

  // Cria ocorrência (+ foto + audit) em transação atômica
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.create({
      data: {
        tenant_id:   (await getTenantId()),
        description: parsed.data.description,
        category:    parsed.data.category,
        severity:    parsed.data.severity,
        status:      'OPEN',
        deadline,
        reported_by: userId,
        collection_point_id: parsed.data.collection_point_id || null,
      },
    })

    if (photoPayload) {
      await tx.occurrencePhoto.create({
        data: {
          tenant_id:     (await getTenantId()),
          occurrence_id: occurrence.id,
          filename:      photoPayload.filename,
          original_name: photoPayload.original_name,
          mime_type:     photoPayload.mime_type,
          size_bytes:    photoPayload.size_bytes,
          uploaded_by:   userId,
        },
      })
    }

    await logAudit(tx, {
      userId,
      action:    'CREATE',
      tableName: 'occurrences',
      recordId:  occurrence.id,
      after:     { description: parsed.data.description, severity: parsed.data.severity, status: 'OPEN', deadline },
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
      ? await prisma.collectionPoint.findUnique({ where: { id: parsed.data.collection_point_id }, select: { name: true } })
      : null

    const locationText = point ? `no local: ${point.name}` : ''
    const msg = `🚨 *Alerta Solentis*\nNova Ocorrência *${parsed.data.severity === 'CRITICAL' ? 'CRÍTICA' : 'ALTA'}* reportada ${locationText}\n\n*Descrição:* ${parsed.data.description}\n\nAcesse o painel para mais detalhes.`

    // Disparar assincronamente (não precisa travar a requisição com await Promise.all total)
    Promise.all(managers.map(m => sendWhatsAppAlert(m.phone!, msg))).catch(console.error)
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

