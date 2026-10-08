'use server'

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { BUMP_SESSION_VERSION } from '@/lib/session-version'
import { hashPassword, passwordSchema } from '@/lib/password'
import { sendEmail } from '@/lib/email'
import { resetPasswordEmail } from '@/lib/email-templates'
import { getLogger } from '@/lib/logger'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { clientIp, takeResetSlot } from '@/lib/rate-limit'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 60 minutos

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function buildResetUrl(rawToken: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return `${base}/reset?token=${rawToken}`
}

/**
 * Inicia o fluxo de redefinição de senha.
 *
 * Por segurança:
 * - SEMPRE retorna { success: true } sem revelar se o e-mail existe.
 * - NUNCA devolve o token ao cliente — o link vai apenas por e-mail.
 * - Guarda somente o HASH do token no banco, com expiração de 60 min e uso único.
 * - T-10: no máximo 3 pedidos/h por e-mail e 10/h por IP; acima disso o pedido é
 *   ignorado em silêncio (mesma resposta).
 * - T-10: a busca do usuário, a gravação do token e o envio do e-mail rodam DEPOIS
 *   da resposta (`after`), então o tempo de resposta é o mesmo para e-mail
 *   existente, inexistente ou limitado — não dá para descobrir contas pelo tempo.
 */
export async function sendPasswordResetLink(email: string) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  if (!normalizedEmail || normalizedEmail.length > 254) return { success: true }

  const ip = clientIp(await headers())
  let permitido = true
  try {
    permitido = await takeResetSlot(normalizedEmail, ip)
  } catch (err) {
    // fail-open no contador (mesma decisão do login); o envio continua protegido
    // por token de uso único e validade curta.
    const log = await getLogger({ action: 'requestPasswordReset' })
    log.warn({ err, ip }, 'Falha ao checar limite de pedidos de reset')
  }

  if (!permitido) {
    const log = await getLogger({ action: 'requestPasswordReset' })
    log.warn({ ip }, 'Pedido de reset ignorado: limite atingido')
    return { success: true }
  }

  after(() => enviarLinkDeReset(normalizedEmail))
  return { success: true }
}

async function enviarLinkDeReset(normalizedEmail: string): Promise<void> {
  try {
    // O email é globalmente único no schema Prisma, portanto findUnique é seguro.
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    // Conta inexistente ou desativada: nada a enviar (e nada a revelar).
    if (!user || !user.is_active) return

    // Invalida tokens anteriores ainda não usados deste usuário.
    await prisma.passwordResetToken.deleteMany({
      where: { tenant_id: user.tenant_id, user_id: user.id, used_at: null },
    })

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    await prisma.passwordResetToken.create({
      data: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + TOKEN_TTL_MS),
      },
    })

    const resetUrl = buildResetUrl(rawToken)
    const mail = resetPasswordEmail({ url: resetUrl })

    await sendEmail({
      to: user.email,
      subject: mail.subject,
      html: mail.html,
    })
  } catch (err) {
    const log = await getLogger({ action: 'requestPasswordReset' })
    log.error({ err }, 'Falha ao gerar/enviar link de redefinição')
  }
}

/**
 * Conclui a redefinição de senha a partir do token cru recebido pela URL.
 * Valida hash + expiração + uso único antes de trocar a senha.
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return { error: 'Dados inválidos.' }
  }

  const pw = passwordSchema.safeParse(newPassword)
  if (!pw.success) {
    return { error: pw.error.issues[0].message }
  }

  try {
    const tokenHash = hashToken(token)

    // @tenant-safe: token_hash é um segredo aleatório único global; o próprio
    // token é a credencial. O registro carrega o tenant_id do usuário-alvo.
    const record = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!record || record.used_at || record.expires_at < new Date()) {
      return { error: 'Link inválido ou expirado.' }
    }

    const hashed = await hashPassword(newPassword)

    // Troca a senha e marca o token como usado de forma atômica.
    // @tenant-checked: alvo derivado do token de reset validado acima (record).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user_id },
        data: { password_hash: hashed, must_change_password: false, ...BUMP_SESSION_VERSION },
      }),
      // @tenant-checked: mesmo registro de token validado acima.
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
    ])

    return { success: true }
  } catch (err) {
    const log = await getLogger({ action: 'resetPassword' })
    log.error({ err }, 'Erro ao redefinir senha')
    return { error: 'Ocorreu um erro ao processar a requisição.' }
  }
}
