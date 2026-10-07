'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BUMP_SESSION_VERSION } from '@/lib/session-version'
import { hashPassword, passwordSchema, verifyPassword } from '@/lib/password'
import { buckets, countRecent, recordEvents, PWCHANGE_FAIL_LIMIT, PWCHANGE_WINDOW_MS } from '@/lib/rate-limit'
import { GENERIC_ERROR_MESSAGE } from '@/lib/user-errors'
import { unstable_rethrow } from 'next/navigation'
import { getLogger } from '@/lib/logger'
import { z } from 'zod'
import { AuthError } from 'next-auth'

// Política de senha única: passwordSchema (src/lib/password.ts), a mesma que a tela
// mostra. Antes este arquivo tinha uma segunda regra (8 caracteres + maiúscula +
// minúscula) que a tela não mostrava.
const Schema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  })

export type TrocarSenhaState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Troca a senha do próprio usuário (T-11).
 * - Exige a senha ATUAL (ou a provisória recebida), conferida no servidor. Antes,
 *   quem tivesse a sessão aberta (aparelho compartilhado, cookie roubado) trocava
 *   a senha e tomava a conta.
 * - Limite de 5 erros de senha atual por usuário em 15 min.
 * - Incrementa session_version: as outras sessões caem; esta é reemitida pelo signIn.
 */
export async function trocarSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const session = await auth()

  if (!session?.user?.id || !session.user.tenantId) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const parsed = Schema.safeParse({
    currentPassword: formData.get('currentPassword') ?? '',
    newPassword:     formData.get('newPassword') ?? '',
    confirmPassword: formData.get('confirmPassword') ?? '',
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return { fieldErrors: flat.fieldErrors as Record<string, string[]> }
  }

  const log = await getLogger({ userId: session.user.id, tenantId: session.user.tenantId, action: 'trocarSenha' })

  try {
    // Usuário da sessão, pelo id do JWT e dentro do tenant da sessão.
    const userToUpdate = await prisma.user.findFirst({
      where: { id: session.user.id, tenant_id: session.user.tenantId, is_active: true },
      select: { id: true, email: true, password_hash: true },
    })
    if (!userToUpdate) {
      return { error: 'Sessão inválida. Faça login novamente.' }
    }

    const bucket = buckets.passwordChange(userToUpdate.id)
    if ((await countRecent(bucket, PWCHANGE_WINDOW_MS)) >= PWCHANGE_FAIL_LIMIT) {
      return { error: 'Muitas tentativas com a senha atual errada. Aguarde 15 minutos e tente de novo.' }
    }

    const atualOk = await verifyPassword(parsed.data.currentPassword, userToUpdate.password_hash)
    if (!atualOk) {
      await recordEvents([bucket])
      log.warn('Troca de senha recusada: senha atual incorreta')
      return { fieldErrors: { currentPassword: ['Senha atual incorreta'] } }
    }

    const passwordHash = await hashPassword(parsed.data.newPassword)

    // @tenant-checked: userToUpdate foi buscado com id e tenant_id da sessão acima.
    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        password_hash:        passwordHash,
        must_change_password: false,
        // Derruba as outras sessões; esta é reemitida pelo signIn logo abaixo
        ...BUMP_SESSION_VERSION,
      },
    })

    // Re-autentica com a nova senha → JWT novo com mustChangePassword=false
    await signIn('credentials', {
      email:      userToUpdate.email,
      password:   parsed.data.newPassword,
      redirectTo: getDashboard(session.user.role),
    })

  } catch (err) {
    if (err instanceof AuthError) {
      log.error({ err }, 'AuthError na action de trocar senha')
      return { error: 'A senha foi trocada, mas não foi possível entrar de novo. Entre com a nova senha.' }
    }
    unstable_rethrow(err) // NEXT_REDIRECT do signIn (sucesso) segue adiante
    log.error({ err }, 'Falha ao trocar senha')
    return { error: GENERIC_ERROR_MESSAGE }
  }

  return {}
}

function getDashboard(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/turnos'
    case 'MAINTENANCE': return '/manutencao/dashboard'
    case 'SUPER_ADMIN': return '/admin/plantas'
    default:           return '/login'
  }
}
