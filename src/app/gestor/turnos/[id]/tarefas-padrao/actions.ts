'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const TemplateSchema = z.object({
  title: z.string({ error: 'Título obrigatório' })
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
  assigned_to_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  requires_photo: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
  sort_order: z.preprocess(
    (v) => {
      const n = parseInt(String(v ?? ''), 10)
      return isNaN(n) ? 0 : n
    },
    z.number().int().min(0).max(999),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TemplateFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// Valida que o operador designado pertence ao tenant e é OPERATOR ativo
async function validarAssignee(assigneeId: string | null, tenantId: string): Promise<boolean> {
  if (!assigneeId) return true
  const assignee = await prisma.user.findFirst({
    where:  { id: assigneeId, tenant_id: tenantId, is_active: true, role: 'OPERATOR' },
    select: { id: true },
  })
  return !!assignee
}

// ─── Criar template ─────────────────────────────────────────────────────────

export async function criarTemplate(
  shiftId: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const session = await requireManagerOrTechnician()

  const parsed = TemplateSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    assigned_to_id: formData.get('assigned_to_id'),
    requires_photo: formData.get('requires_photo'),
    sort_order:     formData.get('sort_order'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const shift = await prisma.shift.findFirst({
    where:  { id: shiftId, tenant_id: tenantId },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  if (!(await validarAssignee(parsed.data.assigned_to_id, tenantId))) {
    return { error: 'Operador selecionado não encontrado ou inativo.' }
  }

  await prisma.shiftTaskTemplate.create({
    data: {
      tenant_id:      tenantId,
      shift_id:       shiftId,
      title:          parsed.data.title,
      description:    parsed.data.description,
      assigned_to_id: parsed.data.assigned_to_id,
      requires_photo: parsed.data.requires_photo,
      sort_order:     parsed.data.sort_order,
      created_by:     userId,
    },
  })

  revalidatePath(`/gestor/turnos/templates/${shiftId}`)
  return { success: true }
}

// ─── Atualizar template ───────────────────────────────────────────────────────

export async function atualizarTemplate(
  templateId: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await requireManagerOrTechnician()

  const parsed = TemplateSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    assigned_to_id: formData.get('assigned_to_id'),
    requires_photo: formData.get('requires_photo'),
    sort_order:     formData.get('sort_order'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()

  const template = await prisma.shiftTaskTemplate.findFirst({
    where:  { id: templateId, tenant_id: tenantId },
    select: { id: true, shift_id: true },
  })
  if (!template) return { error: 'Template não encontrado.' }

  if (!(await validarAssignee(parsed.data.assigned_to_id, tenantId))) {
    return { error: 'Operador selecionado não encontrado ou inativo.' }
  }

  await prisma.shiftTaskTemplate.updateMany({
    where: { id: templateId, tenant_id: tenantId },
    data: {
      title:          parsed.data.title,
      description:    parsed.data.description,
      assigned_to_id: parsed.data.assigned_to_id,
      requires_photo: parsed.data.requires_photo,
      sort_order:     parsed.data.sort_order,
    },
  })

  revalidatePath(`/gestor/turnos/templates/${template.shift_id}`)
  return { success: true }
}

// ─── Desativar template (soft-delete) ─────────────────────────────────────────
// Não hard-deleta: templates já usados por tarefas viram histórico. Apenas para
// de gerar novas tarefas nas próximas aberturas de turno.

export async function desativarTemplate(templateId: string): Promise<void> {
  await requireManagerOrTechnician()
  const tenantId = await getTenantId()

  const template = await prisma.shiftTaskTemplate.findFirst({
    where:  { id: templateId, tenant_id: tenantId },
    select: { shift_id: true },
  })
  if (!template) return

  await prisma.shiftTaskTemplate.updateMany({
    where: { id: templateId, tenant_id: tenantId },
    data:  { is_active: false },
  })

  revalidatePath(`/gestor/turnos/templates/${template.shift_id}`)
}
