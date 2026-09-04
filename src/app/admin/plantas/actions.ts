'use server'

import { randomInt } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getLogger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'
import { createSetPasswordToken, buildSetPasswordUrl } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email'
import { UsuarioSchema, type UsuarioFormState } from '@/app/gestor/(sistema)/usuarios/schema'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }
  return session
}

function gerarSenhaProvisoria(): string {
  // CSPRNG (randomInt) em vez de Math.random(), que é previsível. 10 caracteres
  // aleatórios sobre o prefixo fixo elevam a entropia da senha provisória.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 10; i++) pwd += chars[randomInt(chars.length)]
  return pwd
}

const PlantaSchema = z.object({
  tenantName:  z.string().min(2, 'Nome da planta muito curto'),
  slug:        z.string().min(2, 'Slug muito curto').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  gestorName:  z.string().min(2, 'Nome do gestor muito curto'),
  gestorEmail: z.string().email('E-mail inválido').transform(v => v.trim().toLowerCase()),
})

export type PlantaFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  success?:      boolean
  tempPassword?: string
  gestorEmail?:  string
}

export async function criarPlanta(
  _prev: PlantaFormState,
  formData: FormData,
): Promise<PlantaFormState> {
  await requireSuperAdmin()

  const parsed = PlantaSchema.safeParse({
    tenantName:  formData.get('tenantName'),
    slug:        formData.get('slug'),
    gestorName:  formData.get('gestorName'),
    gestorEmail: formData.get('gestorEmail'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { tenantName, slug, gestorName, gestorEmail } = parsed.data
  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Criar Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
        }
      })

      // 2. Criar Gestor associado a este Tenant
      await tx.user.create({
        data: {
          tenant_id:            tenant.id,
          name:                 gestorName,
          email:                gestorEmail,
          role:                 'MANAGER',
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        }
      })
    })

    revalidatePath('/admin/plantas')
    return { success: true, tempPassword, gestorEmail }
    
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const target = e.meta?.target as string[] | string
        if (target && target.includes('slug')) {
          return { fieldErrors: { slug: ['Este slug já está em uso'] } }
        }
        if (target && target.includes('email')) {
          return { fieldErrors: { gestorEmail: ['E-mail já cadastrado'] } }
        }
      }
    }
    const log = await getLogger({ action: 'criarPlanta' })
    log.error({ err: e }, 'Erro ao criar planta')
    return { error: 'Erro ao criar planta. Tente novamente.' }
  }
}

// ─── Resetar senha de QUALQUER usuário (super admin, cross-tenant) ───────────
export async function resetarSenhaUsuario(
  userId: string,
): Promise<{ error?: string; tempPassword?: string; userName?: string }> {
  const session = await requireSuperAdmin()

  // Ator (super admin) para o log de auditoria — resolvido pelo e-mail (único global).
  const admin = await prisma.user.findFirst({
    where:  { email: { equals: session.user.email ?? '', mode: 'insensitive' } },
    select: { id: true },
  })

  // @tenant-safe: super admin opera entre plantas de propósito. O alvo é localizado
  // pela PK global do usuário e o acesso é restrito por requireSuperAdmin() acima.
  const target = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, tenant_id: true, name: true },
  })
  if (!target) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      // @tenant-safe: reset por super admin, alvo por PK global (ver justificativa acima).
      await tx.user.update({
        where: { id: userId },
        data:  { password_hash: passwordHash, must_change_password: true },
      })
      await logAudit(tx, {
        tenantId:  target.tenant_id,
        userId:    admin?.id ?? null,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        after:     { must_change_password: true, senha_resetada_por: 'SUPER_ADMIN' },
      })
    })
  } catch (e) {
    const log = await getLogger({ action: 'resetarSenhaUsuario' })
    log.error({ err: e, targetUserId: userId }, 'Falha ao resetar senha (super admin)')
    return { error: 'Erro ao resetar senha do usuário.' }
  }

  revalidatePath(`/admin/plantas/${target.tenant_id}`)
  return { tempPassword, userName: target.name }
}

// ─── Ativar/desativar QUALQUER usuário (super admin, cross-tenant) ───────────
export async function toggleAtivoUsuario(
  userId: string,
): Promise<{ error?: string; isActive?: boolean }> {
  const session = await requireSuperAdmin()

  const admin = await prisma.user.findFirst({
    where:  { email: { equals: session.user.email ?? '', mode: 'insensitive' } },
    select: { id: true },
  })

  // Trava de segurança: super admin não pode desativar a própria conta.
  if (admin?.id === userId) {
    return { error: 'Você não pode desativar a sua própria conta.' }
  }

  // @tenant-safe: super admin opera entre plantas de propósito. Alvo por PK global,
  // acesso restrito por requireSuperAdmin() acima.
  const target = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, tenant_id: true, is_active: true },
  })
  if (!target) return { error: 'Usuário não encontrado.' }

  const novoStatus = !target.is_active

  try {
    await prisma.$transaction(async (tx) => {
      // @tenant-safe: toggle por super admin, alvo por PK global (ver justificativa acima).
      await tx.user.update({
        where: { id: userId },
        data:  { is_active: novoStatus },
      })
      await logAudit(tx, {
        tenantId:  target.tenant_id,
        userId:    admin?.id ?? null,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { is_active: target.is_active },
        after:     { is_active: novoStatus },
      })
    })
  } catch (e) {
    const log = await getLogger({ action: 'toggleAtivoUsuario' })
    log.error({ err: e, targetUserId: userId }, 'Falha ao alterar status (super admin)')
    return { error: 'Erro ao alterar o status do usuário.' }
  }

  revalidatePath(`/admin/plantas/${target.tenant_id}`)
  return { isActive: novoStatus }
}

// ─── Criar usuário DENTRO de uma planta (super admin) ────────────────────────
// tenantId vem "bindado" pela tela de detalhe da planta.
export async function criarUsuarioPlanta(
  tenantId: string,
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  try {
    const session = await requireSuperAdmin()

    const parsed = UsuarioSchema.safeParse({
      name:  formData.get('name'),
      email: formData.get('email'),
      role:  formData.get('role'),
    })
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    }

    // Garante que a planta existe (não cria usuário órfão num tenant inválido).
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
    if (!tenant) return { error: 'Planta não encontrada.' }

    // Ator (super admin) para a auditoria — resolvido pelo e-mail (único global).
    const admin = await prisma.user.findFirst({
      where:  { email: { equals: session.user.email ?? '', mode: 'insensitive' } },
      select: { id: true },
    })

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
        tenantId,
        userId:    admin?.id ?? null,
        action:    'CREATE',
        tableName: 'users',
        recordId:  created.id,
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, is_active: true, criado_por: 'SUPER_ADMIN' },
      })
      return created.id
    })

    // Convite por e-mail para o usuário definir a própria senha (fallback: senha provisória).
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
      const log = await getLogger({ action: 'criarUsuarioPlanta' })
      log.error({ err: mailErr, targetUserId: newUserId }, 'Falha ao enviar convite por e-mail (super admin)')
      inviteError = mailErr instanceof Error ? mailErr.message : 'Erro desconhecido ao enviar e-mail'
    }

    revalidatePath(`/admin/plantas/${tenantId}`)
    return { tempPassword, inviteSent, inviteError }
  } catch (e: any) {
    if (e && typeof e === 'object' && 'message' in e && e.message === 'NEXT_REDIRECT') {
      throw e // deixa o Next tratar redirects
    }
    if (e && e.code === 'P2002') {
      return { fieldErrors: { email: ['Este e-mail já está cadastrado no sistema (pode ser em outra planta).'] } }
    }
    const log = await getLogger({ action: 'criarUsuarioPlanta' })
    log.error({ err: e }, 'Erro ao criar usuário (super admin)')
    return { error: 'Não foi possível criar o usuário. Tente novamente.' }
  }
}

// ─── Ativar/desativar uma PLANTA inteira (super admin) ───────────────────────
// Planta desativada bloqueia o login de todos os seus usuários (ver auth.ts).
export async function toggleAtivoPlanta(
  tenantId: string,
): Promise<{ error?: string; isActive?: boolean }> {
  const session = await requireSuperAdmin()

  const admin = await prisma.user.findFirst({
    where:  { email: { equals: session.user.email ?? '', mode: 'insensitive' } },
    select: { id: true, tenant_id: true },
  })

  // Trava de segurança: super admin não pode desativar a própria planta.
  if (admin?.tenant_id === tenantId) {
    return { error: 'Você não pode desativar a sua própria planta.' }
  }

  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { id: true, is_active: true },
  })
  if (!tenant) return { error: 'Planta não encontrada.' }

  const novoStatus = !tenant.is_active

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data:  { is_active: novoStatus },
      })
      await logAudit(tx, {
        tenantId,
        userId:    admin?.id ?? null,
        action:    'UPDATE',
        tableName: 'tenants',
        recordId:  tenantId,
        before:    { is_active: tenant.is_active },
        after:     { is_active: novoStatus },
      })
    })
  } catch (e) {
    const log = await getLogger({ action: 'toggleAtivoPlanta' })
    log.error({ err: e, tenantId }, 'Falha ao alterar status da planta (super admin)')
    return { error: 'Erro ao alterar o status da planta.' }
  }

  revalidatePath(`/admin/plantas/${tenantId}`)
  revalidatePath('/admin/plantas')
  return { isActive: novoStatus }
}

// ─── Editar dados da planta (nome/slug) — super admin ────────────────────────
const EditPlantaSchema = z.object({
  name: z.string().min(2, 'Nome da planta muito curto'),
  slug: z.string().min(2, 'Slug muito curto').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
})

export type EditPlantaFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function editarPlanta(
  tenantId: string,
  _prev: EditPlantaFormState,
  formData: FormData,
): Promise<EditPlantaFormState> {
  const session = await requireSuperAdmin()

  const parsed = EditPlantaSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const admin = await prisma.user.findFirst({
    where:  { email: { equals: session.user.email ?? '', mode: 'insensitive' } },
    select: { id: true },
  })

  const current = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, slug: true },
  })
  if (!current) return { error: 'Planta não encontrada.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data:  { name: parsed.data.name, slug: parsed.data.slug },
      })
      await logAudit(tx, {
        tenantId,
        userId:    admin?.id ?? null,
        action:    'UPDATE',
        tableName: 'tenants',
        recordId:  tenantId,
        before:    { name: current.name, slug: current.slug },
        after:     { name: parsed.data.name, slug: parsed.data.slug },
      })
    })
  } catch (e: any) {
    if (e && e.code === 'P2002') {
      return { fieldErrors: { slug: ['Este slug já está em uso'] } }
    }
    const log = await getLogger({ action: 'editarPlanta' })
    log.error({ err: e, tenantId }, 'Falha ao editar planta (super admin)')
    return { error: 'Erro ao salvar alterações da planta.' }
  }

  revalidatePath(`/admin/plantas/${tenantId}`)
  revalidatePath('/admin/plantas')
  return { success: true }
}
