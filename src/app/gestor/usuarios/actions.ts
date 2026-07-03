'use server'

import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getLogger } from '@/lib/logger'
import { getTenantId } from '@/lib/tenant'
import { createSetPasswordToken, buildSetPasswordUrl } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

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

    const newUserId = await prisma.$transaction(async (tx) => {
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
      return created.id
    })

    // Envia convite por e-mail para o usuário definir a própria senha (válido por 7 dias).
    // Falha de e-mail não impede a criação: a senha provisória serve de fallback.
    // O resultado é devolvido para a UI mostrar se o convite saiu ou o motivo da falha.
    let inviteSent = false
    let inviteError: string | undefined
    try {
      const rawToken = await createSetPasswordToken(newUserId, tenantId, INVITE_TTL_MS)
      const inviteUrl = buildSetPasswordUrl(rawToken)
      const html = `
        <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin-bottom: 16px;">Você foi convidado para o Solentis</h2>
          <p>Olá, ${parsed.data.name}. Uma conta foi criada para você no Solentis.</p>
          <p>Clique no botão abaixo para definir sua senha e acessar. O link é válido por <strong>7 dias</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
              Definir minha senha
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">Se você não esperava este convite, ignore este e-mail.</p>
        </div>
      `
      const emailResult = await sendEmail({ to: parsed.data.email, subject: 'Convite — Solentis', html })
      if (emailResult.success) inviteSent = true
      else inviteError = emailResult.error
    } catch (mailErr) {
      const log = await getLogger({ userId: managerId, tenantId, action: 'criarUsuario' })
      log.error({ err: mailErr, targetUserId: newUserId }, 'Falha ao enviar convite por e-mail')
      inviteError = mailErr instanceof Error ? mailErr.message : 'Erro desconhecido ao enviar e-mail'
    }

    revalidatePath('/gestor/usuarios')
    return { tempPassword, inviteSent, inviteError }
  } catch (e: any) {
    if (e && typeof e === 'object' && 'message' in e && e.message === 'NEXT_REDIRECT') {
      throw e // let Next.js handle redirects
    }
    if (e && e.code === 'P2002') {
      return { fieldErrors: { email: ['Este e-mail já está cadastrado nesta planta.'] } }
    }
    const log = await getLogger({ action: 'criarUsuario' })
    log.error({ err: e }, 'Erro ao criar usuário')
    return { error: 'Não foi possível criar o usuário. Tente novamente.' }
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
    const log = await getLogger({ userId: managerId, tenantId, action: 'toggleAtivo' })
    log.error({ err: e, targetUserId: userId }, 'Falha ao alterar status do usuário')
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
    const log = await getLogger({ userId: managerId, tenantId, action: 'resetarSenha' })
    log.error({ err: e, targetUserId: userId }, 'Falha ao resetar senha do usuário')
    return { error: 'Erro ao resetar senha do usuário.' }
  }

  return { tempPassword }
}
