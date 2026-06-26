import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Tokens de "definir senha" — usados tanto para recuperação de senha quanto
 * para convite de novos usuários. Guardamos apenas o hash; o valor cru só
 * trafega no link enviado por e-mail.
 */

export function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Cria um token de definição de senha para o usuário e invalida os anteriores
 * ainda não usados. Retorna o token CRU (para montar o link do e-mail).
 */
export async function createSetPasswordToken(
  userId: string,
  tenantId: string,
  ttlMs: number,
): Promise<string> {
  await prisma.passwordResetToken.deleteMany({
    where: { user_id: userId, used_at: null },
  })

  const rawToken = randomBytes(32).toString('hex')

  await prisma.passwordResetToken.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + ttlMs),
    },
  })

  return rawToken
}

/** Monta a URL de definição de senha (reaproveita a tela /reset). */
export function buildSetPasswordUrl(rawToken: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  return `${base}/reset?token=${rawToken}`
}
