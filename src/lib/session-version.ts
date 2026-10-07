/**
 * Acesso ao banco usado pela revalidação de sessão (T-06).
 * Separado de `session-guard.ts` para a lógica de decisão ficar testável sem banco.
 */
import { prisma } from '@/lib/prisma'
import type { UserAccessState } from '@/lib/session-guard'

/**
 * Fragmento de `data` que invalida TODAS as sessões abertas do usuário.
 * Use em toda escrita que muda o acesso: desativar, trocar papel/e-mail,
 * resetar ou trocar senha.
 */
export const BUMP_SESSION_VERSION = { session_version: { increment: 1 } } as const

export async function loadUserAccess(userId: string, sid: string): Promise<UserAccessState | null> {
  // @tenant-safe: userId vem do `sub` de um JWT assinado pelo servidor; a checagem
  // compara justamente o tenant atual do usuário com o tenant gravado no token.
  const [user, revogada] = await Promise.all([prisma.user.findUnique({
    where: { id: userId },
    select: {
      is_active: true,
      deleted_at: true,
      role: true,
      tenant_id: true,
      session_version: true,
      must_change_password: true,
      tenant: { select: { is_active: true } },
    },
  }), prisma.revokedSession.findUnique({ where: { sid }, select: { sid: true } })])
  if (!user) return null
  return {
    is_active: user.is_active,
    deleted_at: user.deleted_at,
    role: user.role,
    tenant_id: user.tenant_id,
    session_version: user.session_version,
    must_change_password: user.must_change_password,
    tenant_active: user.tenant?.is_active ?? false,
    session_revoked: !!revogada,
  }
}

/** "Sair": registra o sid encerrado até a idade máxima da sessão (12 h + folga). */
export async function revokeSession(sid: string, userId: string): Promise<void> {
  const expires_at = new Date(Date.now() + 13 * 60 * 60 * 1000)
  await prisma.revokedSession.upsert({
    where: { sid },
    create: { sid, user_id: userId, expires_at },
    update: {},
  })
  // limpeza oportunista do que já expirou
  if (Math.random() < 0.05) await prisma.revokedSession.deleteMany({ where: { expires_at: { lt: new Date() } } })
}
