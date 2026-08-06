'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { saveUpload, saveImageUpload } from '@/lib/storage'
import { randomUUID } from 'crypto'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import { podeAbrirTurnoAgora, horaAberturaPermitida } from '@/lib/shift-window'

const MAX_PHOTOS_TASK = 3
const MAX_FILE_SIZE   = 5 * 1024 * 1024 // 5 MB

// ─── Guards + helpers ─────────────────────────────────────────────────────────

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

// Normaliza para meia-noite local — data do calendário independe da hora
function normalizarData(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Erro de violação de constraint única do Postgres (via Prisma).
function isP2002(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002'
}

// Escolhe a mensagem conforme QUAL índice único de turno foi violado numa corrida:
// uniq_turno_ativo_por_operador (por operador) vs. uniq_shift_instance_ativa (por período).
function mensagemP2002Turno(e: unknown): string {
  const target = (e as { meta?: { target?: unknown } })?.meta?.target
  const alvo = Array.isArray(target) ? target.join(',') : String(target ?? '')
  return alvo.includes('operador')
    ? 'Você já tem um turno aberto. Passe o turno atual antes de abrir outro.'
    : 'Já existe um turno aberto para este período.'
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AbrirTurnoSchema = z.object({
  shift_id: z.string().min(1, 'Selecione o turno'),
})

const IniciarPassagemSchema = z.object({
  pending_items: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  outgoing_observations: z.string().min(5, 'A observação do turno deve ter pelo menos 5 caracteres.'),
  confirm: z.literal('on', {
    error: 'É obrigatório confirmar a passagem do turno.'
  }),
})

const ConfirmarPassagemSchema = z.object({
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  shift_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const ConcluirTarefaSchema = z.object({
  completion_notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TurnoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Lazy timeout (chamado em Server Components ao renderizar a página) ────────
// Não é uma Server Action de formulário — é chamada direto no page.tsx

export async function aplicarTimeouts(): Promise<void> {
  const now = new Date()
  await prisma.shiftHandover.updateMany({
    where: {
      tenant_id:  await getTenantId(),
      status:     'PENDING',
      timeout_at: { lt: now },
    },
    data: { status: 'TIMED_OUT' },
  })
}

// ─── Abrir turno ──────────────────────────────────────────────────────────────

export async function abrirTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem abrir turnos.' }

  const parsed = AbrirTurnoSchema.safeParse({
    shift_id: formData.get('shift_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const today = normalizarData(new Date())

  // Verifica que o turno configurado existe e pertence ao tenant
  const shift = await prisma.shift.findFirst({
    where:  { id: parsed.data.shift_id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  const tenant_id = await getTenantId()

  // Verificação de duplicado em transação. A garantia atômica REAL vem do índice
  // único parcial uniq_shift_instance_ativa (prisma/sql/add_unique_open_shift.sql):
  // sob Postgres a checagem abaixo sozinha não impede corrida entre cliques concorrentes.
  let result: TurnoFormState | null
  try {
    result = await prisma.$transaction(async (tx) => {
    const existing = await tx.shiftInstance.findFirst({
      where: {
        tenant_id,
        shift_id:  parsed.data.shift_id,
        date:      today,
        status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
      },
    })
    if (existing) {
      return { error: 'Já existe um turno aberto para este período.' } as TurnoFormState
    }

    // Se existe instância pré-agendada (SCHEDULED), promove para OPEN
    const scheduled = await tx.shiftInstance.findFirst({
      where: {
        tenant_id,
        shift_id:  parsed.data.shift_id,
        date:      today,
        status:    'SCHEDULED',
      },
    })

    let instanceId: string
    if (scheduled) {
      await tx.shiftInstance.updateMany({ where: { id: scheduled.id, tenant_id }, data: {
          opened_by: userId,
          opened_at: new Date(),
          status:    'OPEN',
        },
      })
      instanceId = scheduled.id
    } else {
      const created = await tx.shiftInstance.create({
        data: {
          tenant_id,
          shift_id:  parsed.data.shift_id,
          date:      today,
          opened_by: userId,
          opened_at: new Date(),
          status:    'OPEN',
        },
      })
      instanceId = created.id
    }

    // Templates de tarefa do turno → cria uma ShiftTask PENDING para cada um.
    // Guarda anti-duplicação: não recria templates que já viraram tarefa nesta
    // instância (importa para turnos pré-agendados que podem ser reabertos).
    const templates = await tx.shiftTaskTemplate.findMany({
      where: { tenant_id, shift_id: parsed.data.shift_id, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    })
    if (templates.length > 0) {
      const jaCriadas = await tx.shiftTask.findMany({
        where:  { tenant_id, shift_instance_id: instanceId, template_id: { not: null } },
        select: { template_id: true },
      })
      const jaCriadasIds = new Set(jaCriadas.map((t) => t.template_id))
      const aCriar = templates.filter((t) => !jaCriadasIds.has(t.id))
      if (aCriar.length > 0) {
        await tx.shiftTask.createMany({
          data: aCriar.map((t) => ({
            tenant_id,
            shift_instance_id: instanceId,
            title:             t.title,
            description:       t.description,
            assigned_to_id:    t.assigned_to_id,
            requires_photo:    t.requires_photo,
            template_id:       t.id,
            created_by:        userId,
            status:            'PENDING',
          })),
        })
      }
    }

    return null
    })
  } catch (e: unknown) {
    // Corrida perdida: o índice único parcial rejeitou a 2ª criação concorrente.
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { error: 'Já existe um turno aberto para este período.' }
    }
    throw e
  }

  if (result?.error) return result
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Iniciar passagem (Etapa 1 — operador sainte) ─────────────────────────────

export async function iniciarPassagem(
  instanceId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem iniciar passagens.' }

  const parsed = IniciarPassagemSchema.safeParse({
    pending_items:         formData.get('pending_items'),
    outgoing_observations: formData.get('outgoing_observations'),
    confirm:               formData.get('confirm'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const instance = await prisma.shiftInstance.findFirst({ where: { id: instanceId , tenant_id: (await getTenantId()) },
    include: {
      shift:    { select: { handover_timeout_minutes: true } },
      handover: { select: { id: true } },
    },
  })
  if (!instance || instance.tenant_id !== (await getTenantId())) return { error: 'Turno não encontrado.' }
  if (instance.status !== 'OPEN')    return { error: 'Este turno não está aberto.' }
  if (instance.handover)             return { error: 'A passagem já foi iniciada.' }

  // Auto-captura do checklist: leituras, ocorrências abertas e tarefas pendentes
  const [readingsCount, openOccurrencesCount, pendingTasks] = await Promise.all([
    prisma.reading.count({
      where: { tenant_id: (await getTenantId()), shift_instance_id: instanceId },
    }),
    prisma.occurrence.count({
      where: { tenant_id: (await getTenantId()), status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.findMany({
      where:  { tenant_id: (await getTenantId()), shift_instance_id: instanceId, status: 'PENDING' },
      select: { title: true },
    }),
  ])

  const checklistData = {
    readings_count:         readingsCount,
    open_occurrences_count: openOccurrencesCount,
    pending_items:          parsed.data.pending_items ?? '',
    pending_tasks_count:    pendingTasks.length,
    pending_tasks:          pendingTasks.map((t) => t.title),
  }

  const handoverAt = new Date()
  const timeoutAt  = new Date(
    handoverAt.getTime() + instance.shift.handover_timeout_minutes * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.create({
      data: {
        tenant_id:             (await getTenantId()),
        shift_instance_id:     instanceId,
        outgoing_user_id:      userId,
        checklist_data:        JSON.stringify(checklistData),
        outgoing_observations: parsed.data.outgoing_observations,
        handover_at:           handoverAt,
        timeout_at:            timeoutAt,
        status:                'PENDING',
      },
    })
    await tx.shiftInstance.updateMany({ where: { id: instanceId , tenant_id: (await getTenantId()) }, data:  { status: 'HANDOVER_PENDING' },
    })
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Confirmar passagem (Etapa 2 — operador entrante) ─────────────────────────

export async function confirmarPassagem(
  handoverId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem confirmar passagens.' }

  const parsed = ConfirmarPassagemSchema.safeParse({
    incoming_observations: formData.get('incoming_observations'),
    shift_id:              formData.get('shift_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: { shift_instance: { select: { id: true, tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'PENDING') {
    return { error: 'Esta passagem já foi encerrada.' }
  }
  // Sainte não pode confirmar a própria passagem
  if (handover.outgoing_user_id === userId) {
    return { error: 'Quem iniciou a passagem não pode confirmá-la.' }
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Confirma a passagem
    await tx.shiftHandover.updateMany({ where: { id: handoverId , tenant_id: (await getTenantId()) }, data: {
        status:                'CONFIRMED',
        confirmed_at:          now,
        incoming_user_id:      userId,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    // Fecha o turno anterior
    await tx.shiftInstance.updateMany({ where: { id: handover.shift_instance.id , tenant_id: (await getTenantId()) }, data:  { status: 'CLOSED', closed_at: now },
    })

    // Se o operador entrante selecionou um turno, abre automaticamente
    if (parsed.data.shift_id) {
      const today = normalizarData(new Date())
      const tenantId = await getTenantId()

      // Verifica se já não existe turno aberto para este período
      const existingOpen = await tx.shiftInstance.findFirst({
        where: {
          tenant_id: tenantId,
          shift_id:  parsed.data.shift_id,
          date:      today,
          status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
        },
      })

      if (!existingOpen) {
        // Verifica se há instância pré-agendada
        const scheduled = await tx.shiftInstance.findFirst({
          where: {
            tenant_id: tenantId,
            shift_id:  parsed.data.shift_id,
            date:      today,
            status:    'SCHEDULED',
          },
        })

        let newInstanceId: string

        if (scheduled) {
          await tx.shiftInstance.updateMany({
            where: { id: scheduled.id, tenant_id: tenantId },
            data: { opened_by: userId, opened_at: now, status: 'OPEN' },
          })
          newInstanceId = scheduled.id
        } else {
          const newInst = await tx.shiftInstance.create({
            data: {
              tenant_id: tenantId,
              shift_id:  parsed.data.shift_id,
              date:      today,
              opened_by: userId,
              opened_at: now,
              status:    'OPEN',
            },
          })
          newInstanceId = newInst.id
        }

        // Migrar tarefas pendentes do turno anterior para o novo
        await tx.shiftTask.updateMany({
          where: {
            tenant_id:         tenantId,
            shift_instance_id: handover.shift_instance.id,
            status:            'PENDING',
          },
          data: {
            shift_instance_id: newInstanceId,
          },
        })
      }
    }
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Concluir tarefa ──────────────────────────────────────────────────────────

export async function concluirTarefa(
  taskId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem concluir tarefas.' }

  const parsed = ConcluirTarefaSchema.safeParse({
    completion_notes: formData.get('completion_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: (await getTenantId()) },
    include: {
      shift_instance: { select: { status: true } },
      photos:         { select: { id: true } },
    },
  })
  if (!task)                                   return { error: 'Tarefa não encontrada.' }
  if (task.status !== 'PENDING')               return { error: 'Esta tarefa já foi concluída ou pulada.' }
  if (task.shift_instance && task.shift_instance.status === 'CLOSED') return { error: 'O turno já foi encerrado.' }

  // Valida fotos (0–3 por tarefa; considera fotos já existentes)
  const files = (formData.getAll('photos') as File[]).filter((f) => f.size > 0)
  // Foto obrigatória quando o template exige (defesa em profundidade — o client
  // também bloqueia, mas a action valida de novo).
  if (task.requires_photo && task.photos.length + files.length === 0) {
    return { error: 'Esta tarefa exige ao menos 1 foto de comprovação.' }
  }
  if (task.photos.length + files.length > MAX_PHOTOS_TASK) {
    return { error: `Máximo de ${MAX_PHOTOS_TASK} fotos por tarefa.` }
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) return { error: `${file.name} excede 5 MB.` }
  }

  // Salva arquivos no storage (Blob em produção, disco em dev) antes da transação
  const photoRecords: { filename: string; original_name: string; mime_type: string; size_bytes: number }[] = []
  if (files.length > 0) {
    for (const file of files) {
      let stored: string
      try {
        stored = await saveImageUpload(file, 'tasks', MAX_FILE_SIZE)
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : `Erro no upload de ${file.name}` }
      }
      photoRecords.push({ filename: stored, original_name: file.name, mime_type: file.type, size_bytes: file.size })
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.shiftTask.updateMany({ where: { id: taskId , tenant_id: (await getTenantId()) }, data:  {
        status:           'DONE',
        completed_at:     now,
        completed_by:     userId,
        completion_notes: parsed.data.completion_notes,
      },
    })
    if (photoRecords.length > 0) {
      const tenantId = await getTenantId()
      await tx.shiftTaskPhoto.createMany({
        data: photoRecords.map((p) => ({
          tenant_id:     tenantId,
          task_id:       taskId,
          filename:      p.filename,
          original_name: p.original_name,
          mime_type:     p.mime_type,
          size_bytes:    p.size_bytes,
          uploaded_by:   userId,
          uploaded_at:   now,
        })),
      })
    }
  })

  revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Pular tarefa ─────────────────────────────────────────────────────────────

export async function pularTarefa(taskId: string): Promise<void> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: (await getTenantId()), status: 'PENDING' },
    include: { shift_instance: { select: { status: true } } },
  })
  if (!task || (task.shift_instance && task.shift_instance.status === 'CLOSED')) return

  await prisma.shiftTask.updateMany({ where: { id: taskId , tenant_id: (await getTenantId()) }, data:  { status: 'SKIPPED' },
  })
  if (task.shift_instance_id) revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
}

// ─── Assumir posto (turno anterior esquecido) ─────────────────────────────────

const AssumirPostoSchema = z.object({
  old_instance_id: z.string().min(1, 'ID do turno anterior obrigatório'),
  new_shift_id: z.string().min(1, 'Selecione o turno a abrir'),
})

export async function assumirPosto(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem assumir postos.' }

  const parsed = AssumirPostoSchema.safeParse({
    old_instance_id: formData.get('old_instance_id'),
    new_shift_id:    formData.get('new_shift_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const tenantId = await getTenantId()

  const oldInstance = await prisma.shiftInstance.findFirst({
    where: { id: parsed.data.old_instance_id, tenant_id: tenantId, status: 'OPEN' },
    include: {
      shift:  { select: { handover_timeout_minutes: true } },
      opener: { select: { name: true } },
    },
  })
  if (!oldInstance) return { error: 'Turno anterior não encontrado ou já fechado.' }
  if (oldInstance.opened_by === userId) return { error: 'Você não pode assumir seu próprio turno.' }

  const now = new Date()
  const today = normalizarData(new Date())

  const result = await prisma.$transaction(async (tx) => {
    // Cria registro de handover automático/compulsório
    const timeoutAt = new Date(now.getTime() + 1)
    await tx.shiftHandover.create({
      data: {
        tenant_id:             tenantId,
        shift_instance_id:     oldInstance.id,
        outgoing_user_id:      oldInstance.opened_by,
        incoming_user_id:      userId,
        checklist_data:        JSON.stringify({
          readings_count: 0,
          open_occurrences_count: 0,
          pending_items: '',
          pending_tasks_count: 0,
          pending_tasks: [],
          auto_takeover: true,
        }),
        outgoing_observations: `Passagem automática - Posto assumido compulsoriamente`,
        incoming_observations: `Posto assumido pelo operador (turno anterior não foi encerrado)`,
        handover_at:           now,
        timeout_at:            timeoutAt,
        confirmed_at:          now,
        status:                'CONFIRMED',
      },
    })

    // Fecha o turno anterior
    await tx.shiftInstance.updateMany({
      where: { id: oldInstance.id, tenant_id: tenantId },
      data:  { status: 'CLOSED', closed_at: now },
    })

    // Abre o novo turno
    const existing = await tx.shiftInstance.findFirst({
      where: {
        tenant_id: tenantId,
        shift_id:  parsed.data.new_shift_id,
        date:      today,
        status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
      },
    })
    if (existing) {
      return { error: 'Já existe um turno aberto para este período.' } as TurnoFormState
    }

    const scheduled = await tx.shiftInstance.findFirst({
      where: {
        tenant_id: tenantId,
        shift_id:  parsed.data.new_shift_id,
        date:      today,
        status:    'SCHEDULED',
      },
    })

    let newInstanceId: string

    if (scheduled) {
      await tx.shiftInstance.updateMany({
        where: { id: scheduled.id, tenant_id: tenantId },
        data:  { opened_by: userId, opened_at: now, status: 'OPEN' },
      })
      newInstanceId = scheduled.id
    } else {
      const newInst = await tx.shiftInstance.create({
        data: {
          tenant_id: tenantId,
          shift_id:  parsed.data.new_shift_id,
          date:      today,
          opened_by: userId,
          opened_at: now,
          status:    'OPEN',
        },
      })
      newInstanceId = newInst.id
    }

    // Migrar tarefas pendentes
    await tx.shiftTask.updateMany({
      where: {
        tenant_id:         tenantId,
        shift_instance_id: oldInstance.id,
        status:            'PENDING',
      },
      data: {
        shift_instance_id: newInstanceId,
      },
    })

    return null
  })

  if (result?.error) return result
  revalidatePath('/operador/turnos')
  revalidatePath('/operador/dashboard')
  return { success: true }
}

// ─── Repetir tarefa ───────────────────────────────────────────────────────────
// Cria uma NOVA tarefa a partir de uma concluída/pulada, preservando a original
// intacta (fotos e notas). repeated_from_id encadeia a tentativa anterior.

export async function repetirTarefa(
  taskId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem repetir tarefas.' }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const tenant_id = await getTenantId()

  const reasonRaw = formData.get('reason')
  const reason =
    reasonRaw == null || String(reasonRaw).trim() === ''
      ? null
      : String(reasonRaw).trim().slice(0, 500)

  const original = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id },
    include: { shift_instance: { select: { id: true, status: true } } },
  })
  if (!original) return { error: 'Tarefa não encontrada.' }
  if (original.status !== 'DONE' && original.status !== 'SKIPPED') {
    return { error: 'Só é possível repetir tarefas concluídas ou puladas.' }
  }

  // Turno de destino: o mesmo, se ainda aberto; senão, o turno ativo do operador.
  let targetInstanceId: string
  if (original.shift_instance && original.shift_instance.status !== 'CLOSED') {
    targetInstanceId = original.shift_instance.id
  } else {
    const active = await prisma.shiftInstance.findFirst({
      where:   { tenant_id, opened_by: userId, status: 'OPEN' },
      orderBy: { opened_at: 'desc' },
      select:  { id: true },
    })
    if (!active) return { error: 'Nenhum turno aberto para registrar a repetição. Abra um turno primeiro.' }
    targetInstanceId = active.id
  }

  await prisma.shiftTask.create({
    data: {
      tenant_id,
      shift_instance_id: targetInstanceId,
      title:             original.title,
      description:       original.description,
      assigned_to_id:    original.assigned_to_id,
      requires_photo:    original.requires_photo,
      template_id:       original.template_id,
      repeated_from_id:  original.id,
      repeat_reason:     reason,
      created_by:        userId,
      status:            'PENDING',
    },
  })

  revalidatePath(`/operador/turnos/${targetInstanceId}/tarefas`)
  if (original.shift_instance) revalidatePath(`/operador/turnos/${original.shift_instance.id}/tarefas`)
  revalidatePath('/operador/turnos')
  return { success: true }
}
