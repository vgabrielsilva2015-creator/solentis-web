'use server'

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { sendEmail } from '@/lib/email'

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
 */
export async function sendPasswordResetLink(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  // @tenant-safe: fluxo de auth busca usuario pelo email globalmente
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' }, is_active: true },
  })

  // Não revelamos se o usuário existe: retornamos sucesso de qualquer forma.
  if (!user) {
    return { success: true }
  }

  try {
    // Invalida tokens anteriores ainda não usados deste usuário.
    await prisma.passwordResetToken.deleteMany({
      where: { user_id: user.id, used_at: null },
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
    const html = `
      <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 16px;">Redefinição de senha — Solentis</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>60 minutos</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
            Redefinir senha
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">Se você não solicitou isso, ignore este e-mail — sua senha continua a mesma.</p>
      </div>
    `

    await sendEmail({
      to: user.email,
      subject: 'Redefinição de senha — Solentis',
      html,
    })
  } catch (err) {
    console.error('[reset] Falha ao gerar/enviar link de redefinição:', err)
    // Mesmo em erro interno, não revelamos detalhes ao cliente.
  }

  return { success: true }
}

/**
 * Conclui a redefinição de senha a partir do token cru recebido pela URL.
 * Valida hash + expiração + uso único antes de trocar a senha.
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword || newPassword.length < 8) {
    return { error: 'Dados inválidos ou senha muito curta.' }
  }

  try {
    const tokenHash = hashToken(token)

    const record = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
    })

    if (!record || record.used_at || record.expires_at < new Date()) {
      return { error: 'Link inválido ou expirado.' }
    }

    const hashed = await hashPassword(newPassword)

    // Troca a senha e marca o token como usado de forma atômica.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.user_id },
        data: { password_hash: hashed, must_change_password: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used_at: new Date() },
      }),
    ])

    return { success: true }
  } catch (err) {
    console.error('[reset] Erro ao redefinir senha:', err)
    return { error: 'Ocorreu um erro ao processar a requisição.' }
  }
}
