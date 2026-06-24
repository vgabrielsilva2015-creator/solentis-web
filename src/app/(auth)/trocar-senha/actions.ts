'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'
import { AuthError } from 'next-auth'

const Schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter letra maiúscula')
      .regex(/[a-z]/, 'Deve conter letra minúscula')
      .regex(/[0-9]/, 'Deve conter número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type TrocarSenhaState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function trocarSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const session = await auth()

  if (!session?.user?.email) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const parsed = Schema.safeParse({
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return { fieldErrors: flat.fieldErrors as Record<string, string[]> }
  }

  try {
    const passwordHash = await hashPassword(parsed.data.newPassword)

    // Busca o usuário usando findFirst (case-insensitive) em vez de where unico (case-sensitive)
    const userToUpdate = await prisma.user.findFirst({
      where: {
        tenant_id: session.user.tenantId,
        email: { equals: session.user.email, mode: 'insensitive' }
      }
    })

    if (!userToUpdate) {
      return { error: 'Usuário não encontrado no banco.' }
    }

    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        password_hash:        passwordHash,
        must_change_password: false,
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
      console.error("AuthError na action de trocar senha:", err)
      return { error: 'Ocorreu um erro de autenticação ao trocar a senha.' }
    }
    throw err // Deixa NEXT_REDIRECT e outros erros subirem
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
