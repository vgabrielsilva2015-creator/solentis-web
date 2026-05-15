import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

// ─── Augmentação de tipos do NextAuth ────────────────────────────────────────
declare module 'next-auth' {
  interface User {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
  interface Session {
    user: {
      role: string
      mustChangePassword: boolean
      tenantId: string
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TENANT_ID = 'default'
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const RATE_LIMIT_MAX_ATTEMPTS = 5
const SESSION_MAX_AGE_OPERATOR = 30 * 60  // 30 min em segundos
const SESSION_MAX_AGE_DEFAULT  = 60 * 60  // 60 min em segundos

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Configuração NextAuth ────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Verifica rate limit ANTES de consultar o usuário
        // (evita que atacante contorne o bloqueio explorando timing de resposta)
        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        const recentFailures = await prisma.loginAttempt.count({
          where: {
            tenant_id: TENANT_ID,
            email,
            success: false,
            attempted_at: { gte: windowStart },
          },
        })

        if (recentFailures >= RATE_LIMIT_MAX_ATTEMPTS) {
          throw new Error('RATE_LIMITED')
        }

        const user = await prisma.user.findFirst({
          where: { email, is_active: true },
        })

        // Sempre verifica a senha (mesmo que usuário não exista) para evitar
        // ataque de enumeração de e-mails por diferença de tempo de resposta
        const isValid = user
          ? await verifyPassword(password, user.password_hash)
          : false

        // Registra a tentativa independente do resultado
        await prisma.loginAttempt.create({
          data: {
            tenant_id: TENANT_ID,
            email,
            success: isValid,
          },
        })

        if (!user || !isValid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        })

        return {
          id:                  user.id,
          email:               user.email,
          name:                user.name,
          role:                user.role,
          mustChangePassword:  user.must_change_password,
          tenantId:            user.tenant_id,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
        token.tenantId           = user.tenantId

        // Timeout de sessão diferente por perfil
        const maxAge = user.role === 'OPERATOR'
          ? SESSION_MAX_AGE_OPERATOR
          : SESSION_MAX_AGE_DEFAULT
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      }
      return token
    },
    session({ session, token }) {
      session.user.role               = token.role
      session.user.mustChangePassword = token.mustChangePassword
      session.user.tenantId           = token.tenantId
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_DEFAULT,
  },
})
