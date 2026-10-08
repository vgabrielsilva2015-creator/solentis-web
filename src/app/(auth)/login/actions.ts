'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'
import { getLogger } from '@/lib/logger'
import { LOGIN_MESSAGES, loginErrorMessage } from '@/lib/user-errors'

const LoginSchema = z.object({
  email:    z.string().max(254, 'Texto muito longo (máximo 254 caracteres).').email().transform(v => v.trim().toLowerCase()),
  password: z.string().max(128, 'Texto muito longo (máximo 128 caracteres).').min(1),
})

export type LoginState = {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: LOGIN_MESSAGES.invalidInput }
  }

  try {
    await signIn('credentials', {
      email:       parsed.data.email,
      password:    parsed.data.password,
      redirectTo:  '/',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      const causeCode = err.cause?.err?.message ?? null
      const message = loginErrorMessage(err.type, causeCode)
      // Falha inesperada (banco fora, configuração): detalhe só no log do servidor.
      if (message === LOGIN_MESSAGES.unavailable) {
        const log = await getLogger({ action: 'login' })
        log.error({ err, authErrorType: err.type }, 'Falha inesperada no login')
      }
      return { error: message }
    }
    // signIn lança NEXT_REDIRECT internamente — relançar para o Next processar
    throw err
  }

  return {}
}
