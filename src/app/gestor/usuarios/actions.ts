'use server'

import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'

async function resolveUserId(email: string, tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where:  { 
      email: { equals: email.trim(), mode: 'insensitive' }, 
      tenant_id: tenantId 
    },
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

import { UsuarioSchema, type UsuarioFormState } from './schema'

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  try {
    const session = await requireRole(['MANAGER'])
    const tenantId = await getTenantId()

    const parsed = UsuarioSchema.safeParse({
      name:  formData.get('name'),
      email: formData.get('email'),
      role:  formData.get('role'),
    })
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    }

    const managerId = await resolveUserId(session.user.email!, tenantId)
    if (!managerId) {
      return { error: 'Sessão inválida, faça login novamente.' }
    }

    const tempPassword = gerarSenhaProvisoria()
    const passwordHash = await hashPassword(tempPassword)

    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenant_id:            tenantId,
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
        tenantId: tenantId,
        userId:    managerId,
        action:    'CREATE',
        tableName: 'users',
        recordId:  created.id,
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, is_active: true },
      })
    })

    revalidatePath('/gestor/usuarios')
    return { tempPassword }
  } catch (e: any) {
    if (e && typeof e === 'object' && 'message' in e && e.message === 'NEXT_REDIRECT') {
      throw e // let Next.js handle redirects
    }
    if (e && e.code === 'P2002') {
      return { fieldErrors: { email: ['Este e-mail já está cadastrado nesta planta.'] } }
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    return { error: 'Erro geral (Crash interceptado): ' + errorMessage + ' ' + (e.stack || '') }
  }
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarUsuario(
  userId: string,
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireRole(['MANAGER'])
  const tenantId = await getTenantId()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const managerId = await resolveUserId(session.user.email!, tenantId)
  if (!managerId) return { error: 'Sessão inválida.' }

  const current = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { name: true, email: true, role: true },
  })
  if (!current) return { error: 'Usuário não encontrado.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tenant_id: tenantId },
        data:  { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
      await logAudit(tx, {
        tenantId: tenantId,
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { name: current.name, email: current.email, role: current.role },
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
    })
  } catch (e: any) {
    if (e && e.code === 'P2002') {
      return { fieldErrors: { email: ['Este e-mail já está cadastrado nesta planta.'] } }
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    return { error: 'Erro ao salvar alterações: ' + errorMessage }
  }

  revalidatePath('/gestor/usuarios')
  redirect('/gestor/usuarios')
}

// ─── Toggle ativo (soft-delete / reativação) ─────────────────────────────────

export async function toggleAtivo(
  userId: string,
): Promise<{ error?: string }> {
  const session = await requireRole(['MANAGER'])
  const tenantId = await getTenantId()

  const managerId = await resolveUserId(session.user.email!, tenantId)
  if (!managerId) return { error: 'Sessão inválida.' }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { is_active: true }
  })
  if (!user) return { error: 'Usuário não encontrado.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tenant_id: tenantId },
        data:  { is_active: !user.is_active },
      })
      await logAudit(tx, {
        tenantId: tenantId,
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { is_active:  user.is_active  },
        after:     { is_active: !user.is_active  },
      })
    })
  } catch (e) {
    return { error: 'Erro ao alterar status do usuário.' }
  }

  revalidatePath('/gestor/usuarios')
  revalidatePath(`/gestor/usuarios/${userId}`)
  return {}
}

// ─── Resetar senha ───────────────────────────────────────────────────────────

export async function resetarSenha(
  userId: string,
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await requireRole(['MANAGER'])
  const tenantId = await getTenantId()

  const managerId = await resolveUserId(session.user.email!, tenantId)
  if (!managerId) return { error: 'Sessão inválida.' }

  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { id: true }
  })
  if (!user) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tenant_id: tenantId },
        data:  { password_hash: passwordHash, must_change_password: true },
      })
      await logAudit(tx, {
        tenantId: tenantId,
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        after:     { must_change_password: true },
      })
    })
  } catch (e) {
    return { error: 'Erro ao resetar senha do usuário.' }
  }

  return { tempPassword }
}
