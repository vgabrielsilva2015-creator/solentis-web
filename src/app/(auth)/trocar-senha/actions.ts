'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'

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

  const passwordHash = await hashPassword(parsed.data.newPassword)

  await prisma.user.update({
    where: {
      tenant_id_email: {
        tenant_id: session.user.tenantId,
        email:     session.user.email,
      },
    },
    data: {
      password_hash:        passwordHash,
      must_change_password: false,
    },
  })

  // Re-autentica com a nova senha → JWT novo com mustChangePassword=false
  await signIn('credentials', {
    email:      session.user.email,
    password:   parsed.data.newPassword,
    redirectTo: getDashboard(session.user.role),
  })

  return {}
}

function getDashboard(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/dashboard'
    default:           return '/login'
  }
}
