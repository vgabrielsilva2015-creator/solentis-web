'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'



// ─── Schemas ──────────────────────────────────────────────────────────────────

const AtribuirTarefaSchema = z.object({
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
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TaskFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Atribuir tarefa ──────────────────────────────────────────────────────────

export async function atribuirTarefa(
  instanceId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const ctx = await requirePermission('shift.assign')

  const parsed = AtribuirTarefaSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    assigned_to_id: formData.get('assigned_to_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

  const instance = await prisma.shiftInstance.findFirst({
    where:  { id: instanceId, tenant_id: (await getTenantId()) },
    select: { status: true },
  })
  if (!instance)                    return { error: 'Tarefa não encontrada.' }
  if (instance.status === 'CLOSED') return { error: 'Não é possível adicionar tarefas a um turno fechado.' }

  // Garante que o operador atribuído pertence ao tenant e está ativo
  if (parsed.data.assigned_to_id) {
    const assignee = await prisma.user.findFirst({
      where:  { id: parsed.data.assigned_to_id, tenant_id: (await getTenantId()), is_active: true, role: 'OPERATOR' },
      select: { id: true },
    })
    if (!assignee) return { error: 'Operador selecionado não encontrado ou inativo.' }
  }

  await prisma.shiftTask.create({
    data: {
      tenant_id:         (await getTenantId()),
      shift_instance_id: instanceId,
      title:             parsed.data.title,
      description:       parsed.data.description,
      assigned_to_id:    parsed.data.assigned_to_id,
      created_by:        userId,
      status:            'PENDING',
    },
  })

  revalidatePath(`/gestor/turnos/tarefas/${instanceId}`)
  return { success: true }
}

// ─── Remover tarefa ───────────────────────────────────────────────────────────
// Só PENDING pode ser removida — tarefas DONE/SKIPPED são histórico operacional

export async function removerTarefa(taskId: string): Promise<void> {
  await requirePermission('shift.assign')

  const task = await prisma.shiftTask.findFirst({
    where:  { id: taskId, tenant_id: (await getTenantId()), status: 'PENDING' },
    select: { shift_instance_id: true },
  })
  if (!task) return

  await prisma.shiftTask.deleteMany({ where: { id: taskId , tenant_id: (await getTenantId()) } })
  revalidatePath(`/gestor/turnos/tarefas/${task.shift_instance_id}`)
}
