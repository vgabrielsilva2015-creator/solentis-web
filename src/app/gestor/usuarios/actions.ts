'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso não autorizado')
  }
}

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
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
  await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.user.create({
      data: {
        tenant_id:            TENANT_ID,
        name:                 parsed.data.name,
        email:                parsed.data.email,
        role:                 parsed.data.role,
        password_hash:        passwordHash,
        must_change_password: true,
        is_active:            true,
      },
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
  await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name:  parsed.data.name,
        email: parsed.data.email,
        role:  parsed.data.role,
      },
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
  await requireManager()

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { is_active: true },
  })
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.user.update({
    where: { id: userId },
    data:  { is_active: !user.is_active },
  })

  revalidatePath('/gestor/usuarios')
  revalidatePath(`/gestor/usuarios/${userId}`)
  return {}
}

// ─── Resetar senha ───────────────────────────────────────────────────────────

export async function resetarSenha(
  userId: string,
): Promise<{ error?: string; tempPassword?: string }> {
  await requireManager()

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true },
  })
  if (!user) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password_hash:        passwordHash,
      must_change_password: true,
    },
  })

  return { tempPassword }
}
