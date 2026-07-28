import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_DEFAULT, getSessionMaxAge } from '@/lib/auth-utils'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_DEFAULT,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
        token.tenantId           = user.tenantId
        token.email              = user.email // Garante que a sessão use o e-mail exato do banco de dados

        // Timeout de sessão diferente por perfil
        token.exp = Math.floor(Date.now() / 1000) + getSessionMaxAge(user.role)
      }
      return token
    },
    session({ session, token }) {
      // token.sub carrega o id do usuário (setado pelo NextAuth no sign-in).
      // Sem esta linha, session.user.id fica undefined e quebra o push-actions.
      if (token.sub) session.user.id = token.sub
      session.user.role               = token.role as string
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.tenantId           = token.tenantId as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
