'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
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

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const UsuarioSchema = z.object({
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [managerId, tempPassword] = [
    await resolveUserId(session.user.email!),
    gerarSenhaProvisoria(),
  ]
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenant_id:            (await getTenantId()),
          name:                 parsed.data.name,
          email:                parsed.data.email,
          role:                 parsed.data.role,
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        },
        select: { id: true },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'CREATE',
        tableName: 'users',
        recordId:  created.id,
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, is_active: true },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao criar usuário. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  return { tempPassword }
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarUsuario(
  userId: string,
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [current, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) },
      select: { name: true, email: true, role: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!current) return { error: 'Usuário não encontrado.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { name: current.name, email: current.email, role: current.role },
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  redirect('/gestor/usuarios')
}

// ─── Toggle ativo (soft-delete / reativação) ─────────────────────────────────

export async function toggleAtivo(
  userId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) }, select: { is_active: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { is_active: !user.is_active },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      before:    { is_active:  user.is_active  },
      after:     { is_active: !user.is_active  },
    })
  })

  revalidatePath('/gestor/usuarios')
  revalidatePath(`/gestor/usuarios/${userId}`)
  return {}
}

// ─── Resetar senha ───────────────────────────────────────────────────────────

export async function resetarSenha(
  userId: string,
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) }, select: { id: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { password_hash: passwordHash, must_change_password: true },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      after:     { must_change_password: true },
    })
  })

  return { tempPassword }
}
