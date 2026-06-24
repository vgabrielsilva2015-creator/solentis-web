import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
  isRateLimited,
} from '@/lib/auth-utils'
import { authConfig } from '@/lib/auth.config'

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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Configuração NextAuth ────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

        // Para evitar timing attacks, consultamos o usuário primeiro,
        // mas sempre verificamos a senha mesmo que ele não exista (com um hash dummy).
        const user = await prisma.user.findFirst({
          where: { 
            email: { equals: email.trim(), mode: 'insensitive' }, 
            is_active: true 
          },
        })

        // Hash pré-computado dummy (exemplo: bcrypt de "dummy")
        const dummyHash = "$2a$10$8.z8o.bM.g0U8Q8z9w9f8.3.4.5.6.7.8.9.0.1.2.3.4.5.6.7.8"

        if (!user) {
          // Usuário não existe:
          // Fazemos a verificação do hash dummy para prevenir timing attacks
          await verifyPassword(password, dummyHash).catch(() => {})
          return null
        }

        const tenantIdForLog = user.tenant_id

        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        const recentFailures = await prisma.loginAttempt.count({
          where: {
            tenant_id: tenantIdForLog,
            email,
            success: false,
            attempted_at: { gte: windowStart },
          },
        })

        if (isRateLimited(recentFailures)) {
          throw new Error('RATE_LIMITED')
        }

        const isValid = await verifyPassword(password, user.password_hash)

        // Registra a tentativa de login (auditoria)
        try {
          await prisma.loginAttempt.create({
            data: {
              tenant_id: tenantIdForLog,
              email,
              success: isValid,
            },
          })
        } catch (error) {
          console.error("Falha ao registrar tentativa de login", error)
        }

        if (!isValid) return null

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
})

import { redirect } from 'next/navigation'

export async function requireRole(roles: string[]) {
  const session = await auth()
  if (!session || !roles.includes(session.user.role)) {
    redirect('/login')
  }
  return session
}
