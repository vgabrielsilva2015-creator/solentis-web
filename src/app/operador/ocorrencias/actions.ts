'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'

const TENANT_ID      = 'default'
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireOperator() {
  const session = await auth()
  if (!session || session.user.role !== 'OPERATOR') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
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
  const session = await requireOperator()

  const parsed = OcorrenciaSchema.safeParse({
    description: formData.get('description'),
    severity:    formData.get('severity'),
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

  // Cria ocorrência (+ foto se presente) em transação atômica
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.create({
      data: {
        tenant_id:   TENANT_ID,
        description: parsed.data.description,
        severity:    parsed.data.severity,
        status:      'OPEN',
        deadline,
        reported_by: userId,
      },
    })

    if (photoPayload) {
      await tx.occurrencePhoto.create({
        data: {
          tenant_id:     TENANT_ID,
          occurrence_id: occurrence.id,
          filename:      photoPayload.filename,
          original_name: photoPayload.original_name,
          mime_type:     photoPayload.mime_type,
          size_bytes:    photoPayload.size_bytes,
          uploaded_by:   userId,
        },
      })
    }
  })

  revalidatePath('/operador/ocorrencias')
  return { success: true }
}
