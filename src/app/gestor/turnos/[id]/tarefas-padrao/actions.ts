'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBROpcional } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'



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
    z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').nullable(),
  ),
  requires_photo: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
  sort_order: numeroBROpcional({ inteiro: true, min: 0, max: 999, rotulo: 'A ordem' }).transform((n) => n ?? 0),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TemplateFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Criar template ─────────────────────────────────────────────────────────

export async function criarTemplate(
  shiftId: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const ctx = await requirePermission('shift.assign')

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
  const userId = ctx.userId

  const shift = await prisma.shift.findFirst({
    where:  { id: shiftId, tenant_id: tenantId },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  const erroPosse = await checkOwnership(tenantId, [{
    model: 'user', id: parsed.data.assigned_to_id, optional: true,
    where: { is_active: true, role: 'OPERATOR' },
    message: 'Operador selecionado não encontrado ou inativo.',
  }])
  if (erroPosse) return { error: erroPosse }

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

  revalidatePath(`/gestor/turnos/${shiftId}/tarefas-padrao`)
  return { success: true }
}

// ─── Atualizar template ───────────────────────────────────────────────────────

export async function atualizarTemplate(
  templateId: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await requirePermission('shift.assign')

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

  const erroPosse = await checkOwnership(tenantId, [{
    model: 'user', id: parsed.data.assigned_to_id, optional: true,
    where: { is_active: true, role: 'OPERATOR' },
    message: 'Operador selecionado não encontrado ou inativo.',
  }])
  if (erroPosse) return { error: erroPosse }

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

  revalidatePath(`/gestor/turnos/${template.shift_id}/tarefas-padrao`)
  return { success: true }
}

// ─── Desativar template (soft-delete) ─────────────────────────────────────────
// Não hard-deleta: templates já usados por tarefas viram histórico. Apenas para
// de gerar novas tarefas nas próximas aberturas de turno.

export async function desativarTemplate(templateId: string): Promise<void> {
  await requirePermission('shift.assign')
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

  revalidatePath(`/gestor/turnos/${template.shift_id}/tarefas-padrao`)
}
