import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { getLogger } from '@/lib/logger'
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
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
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
        const log = await getLogger({ action: 'login' })

        // Para evitar timing attacks, consultamos o usuário primeiro,
        // mas sempre verificamos a senha mesmo que ele não exista (com um hash dummy).
        // O email é globalmente único no schema Prisma, portanto findUnique é seguro.
        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: { select: { is_active: true } } },
        })

        // Hash bcrypt REAL (custo 12) de uma senha aleatória descartada. Precisa
        // ser um hash válido: bcrypt.compare contra um hash malformado retorna
        // imediatamente, sem rodar o KDF, o que reabriria a enumeração por timing.
        const dummyHash = '$2b$12$OpBwXlX38xxe3BDPyl0gGOy3o8hdTpVHn.8UmpKJKrYktAlHFGEli'

        if (!user) {
          // Usuário não existe: gastamos o MESMO tempo de um bcrypt custo 12 para
          // que a resposta seja indistinguível de um e-mail existente (anti-timing).
          await verifyPassword(password, dummyHash).catch(() => {})
          return null
        }

        const tenantIdForLog = user.tenant_id

        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        try {
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
        } catch (error) {
          if (error instanceof Error && error.message === 'RATE_LIMITED') {
            throw error // Propaga apenas o bloqueio
          }
          // ⚠️ FAIL-OPEN: se a checagem falhar, o login segue SEM proteção de brute-force.
          // Mantido de propósito (não travar todos os logins num soluço do banco),
          // mas registrado em WARN para ficar visível caso vire recorrente.
          log.warn(
            { err: error, tenantId: tenantIdForLog, attemptedEmail: email },
            'Falha ao checar rate limit — login prosseguindo sem proteção de brute-force',
          )
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
          log.error(
            { err: error, tenantId: tenantIdForLog },
            'Falha ao registrar tentativa de login',
          )
        }

        if (!isValid) return null

        // Conta desativada (soft-delete) não autentica, mesmo com senha correta.
        // Garante que "desativar usuário" revogue o acesso de fato.
        if (!user.is_active) {
          log.warn(
            { tenantId: tenantIdForLog, userId: user.id },
            'Login bloqueado: conta desativada',
          )
          return null
        }

        // Planta (tenant) desativada bloqueia TODOS os seus usuários — exceto o
        // SUPER_ADMIN, que gerencia o sistema e não pode ficar trancado para fora.
        // Garante que "desativar planta" (no super admin) revogue o acesso de fato.
        if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.is_active) {
          log.warn(
            { tenantId: tenantIdForLog, userId: user.id },
            'Login bloqueado: planta desativada',
          )
          return null
        }

        try {
          // @tenant-checked: user é o registro autenticado nesta própria função.
          await prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
          })
        } catch (error) {
          log.error(
            { err: error, tenantId: tenantIdForLog, userId: user.id },
            'Falha ao atualizar last_login_at',
          )
        }

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
  // ─── NOTA SOBRE RBAC ──────────────────────────────────────────────────────────
  // Decisão Arquitetural: O sistema de Controle de Acesso Baseado em Papéis (RBAC) 
  // atual utiliza um modelo simples onde as roles são validadas em funções utilitárias 
  // (`requireRole`, `requireTechnicianOrManager`, etc.) ou diretamente nas páginas.
  // 
  // Esta abordagem foi escolhida pois atende completamente às necessidades do MVP. 
  // Sistemas mais complexos (como CASL, ou verificação per-entity em um middleware 
  // centralizado) foram considerados overkill neste momento. A segurança se apoia 
  // fortemente no Tenant Isolation (garantido no `src/lib/tenant.ts`) e na 
  // simplicidade dos papéis (OPERATOR, TECHNICIAN, MANAGER, MAINTENANCE).
  // ─────────────────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session || !roles.includes(session.user.role)) {
    redirect('/login')
  }
  return session
}
