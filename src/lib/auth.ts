import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { getLogger } from '@/lib/logger'
import { clientIp, decideLogin, loginCounts, recordLoginFailure, sleep } from '@/lib/rate-limit'
import { authConfig } from '@/lib/auth.config'
import { LOGIN_RATE_LIMITED_CODE, LOGIN_UNAVAILABLE_CODE } from '@/lib/user-errors'

// ─── Augmentação de tipos do NextAuth ────────────────────────────────────────
declare module 'next-auth' {
  interface User {
    role: string
    mustChangePassword: boolean
    tenantId: string
    sessionVersion: number
  }
  interface Session {
    /** id da sessão (estável entre renovações), usado pelo "Sair" */
    sid?: string
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
    sid?: string
    sv?: number
    loginAt?: number
    lastSeen?: number
    checkedAt?: number
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().max(254, 'Texto muito longo (máximo 254 caracteres).').email().transform((v) => v.trim().toLowerCase()),
  password: z.string().max(128, 'Texto muito longo (máximo 128 caracteres).').min(1),
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
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const log = await getLogger({ action: 'login' })
        const ip = clientIp(request?.headers)

        // T-10: limite ANTES de qualquer consulta ao usuário, igual para e-mail
        // existente ou não. Bloqueia IP e par e-mail+IP; o e-mail sozinho só
        // atrasa (sem lockout que um terceiro possa provocar na conta alheia).
        try {
          const decision = decideLogin(await loginCounts(email, ip))
          if (decision.blocked) throw new Error(LOGIN_RATE_LIMITED_CODE)
          if (decision.delayMs > 0) await sleep(decision.delayMs)
        } catch (error) {
          if (error instanceof Error && error.message === LOGIN_RATE_LIMITED_CODE) throw error
          // ⚠️ FAIL-OPEN (decisão mantida): sem banco, o login segue sem limite.
          log.warn({ err: error, ip }, 'Falha ao checar limite de tentativas — login prosseguindo sem limite')
        }

        // Toda falha (senha errada, e-mail inexistente, conta/planta inativa) conta.
        const falhou = async () => {
          await recordLoginFailure(email, ip).catch((err) =>
            log.warn({ err, ip }, 'Falha ao registrar tentativa no limitador'))
          return null
        }

        // Para evitar timing attacks, consultamos o usuário primeiro,
        // mas sempre verificamos a senha mesmo que ele não exista (com um hash dummy).
        // O email é globalmente único no schema Prisma, portanto findUnique é seguro.
        let user
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: { tenant: { select: { is_active: true } } },
          })
        } catch (error) {
          // Banco indisponível: registra o detalhe e devolve um código neutro.
          // A mensagem original do Prisma (host/porta) nunca deve chegar ao cliente.
          log.error({ err: error }, 'Falha ao consultar usuário no login')
          throw new Error(LOGIN_UNAVAILABLE_CODE)
        }

        // Hash bcrypt REAL (custo 12) de uma senha aleatória descartada. Precisa
        // ser um hash válido: bcrypt.compare contra um hash malformado retorna
        // imediatamente, sem rodar o KDF, o que reabriria a enumeração por timing.
        const dummyHash = '$2b$12$OpBwXlX38xxe3BDPyl0gGOy3o8hdTpVHn.8UmpKJKrYktAlHFGEli'

        if (!user) {
          // Usuário não existe: gastamos o MESMO tempo de um bcrypt custo 12 para
          // que a resposta seja indistinguível de um e-mail existente (anti-timing).
          await verifyPassword(password, dummyHash).catch(() => {})
          return falhou()
        }

        const tenantIdForLog = user.tenant_id

        const isValid = await verifyPassword(password, user.password_hash)

        // Registra a tentativa de login (auditoria)
        try {
          await prisma.loginAttempt.create({
            data: {
              tenant_id: tenantIdForLog,
              email,
              ip_address: ip,
              success: isValid,
            },
          })
        } catch (error) {
          log.error(
            { err: error, tenantId: tenantIdForLog },
            'Falha ao registrar tentativa de login',
          )
        }

        if (!isValid) return falhou()

        // Conta desativada (soft-delete) não autentica, mesmo com senha correta.
        // Garante que "desativar usuário" revogue o acesso de fato.
        if (!user.is_active) {
          log.warn(
            { tenantId: tenantIdForLog, userId: user.id },
            'Login bloqueado: conta desativada',
          )
          return falhou()
        }

        // Planta (tenant) desativada bloqueia TODOS os seus usuários — exceto o
        // SUPER_ADMIN, que gerencia o sistema e não pode ficar trancado para fora.
        // Garante que "desativar planta" (no super admin) revogue o acesso de fato.
        if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.is_active) {
          log.warn(
            { tenantId: tenantIdForLog, userId: user.id },
            'Login bloqueado: planta desativada',
          )
          return falhou()
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
          sessionVersion:      user.session_version,
        }
      },
    }),
  ],
})

