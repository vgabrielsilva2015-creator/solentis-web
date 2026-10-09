import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_DEFAULT } from '@/lib/auth-utils'
import { guardSession, initialGuardFields, type GuardedToken } from '@/lib/session-guard'
import { loadUserAccess } from '@/lib/session-version'
import { logger } from '@/lib/logger'

// Usado pelo proxy (runtime Node no Next 16) e pelo auth() das páginas/actions.
// O callback `jwt` roda em toda requisição autenticada; a revalidação no banco
// acontece no máximo a cada SESSION_REVALIDATE_SECONDS por sessão (T-06).
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Teto do cookie. Os limites reais (inatividade por perfil e idade absoluta)
    // são aplicados em guardSession — o Auth.js sobrescreve token.exp a cada
    // renovação, por isso setar token.exp aqui não tinha efeito.
    maxAge: SESSION_MAX_AGE_DEFAULT,
  },
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000)
      if (user) {
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
        token.tenantId           = user.tenantId
        token.mfa                = user.mfa
        token.email              = user.email // Garante que a sessão use o e-mail exato do banco de dados
        Object.assign(token, initialGuardFields(user.sessionVersion, now))
        return token
      }

      const result = await guardSession(token as GuardedToken, now, loadUserAccess)
      if (!result.ok) {
        logger.info(
          { userId: token.sub, tenantId: token.tenantId, reason: result.reason },
          'Sessão encerrada pela revalidação',
        )
        return null // Auth.js apaga o cookie e trata como deslogado
      }
      if (result.dbError) {
        logger.warn(
          { err: result.dbError, userId: token.sub, tenantId: token.tenantId },
          'Falha ao revalidar sessão no banco — sessão mantida (fail-open)',
        )
      }
      return result.token as typeof token
    },
    session({ session, token }) {
      // token.sub carrega o id do usuário (setado pelo NextAuth no sign-in).
      // Sem esta linha, session.user.id fica undefined e quebra o push-actions.
      if (token.sub) session.user.id = token.sub
      session.sid = token.sid as string | undefined
      session.user.role               = token.role as string
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.tenantId           = token.tenantId as string
      session.user.mfa                = (token.mfa as 'ok' | 'pending' | 'none' | undefined) ?? 'none'
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
