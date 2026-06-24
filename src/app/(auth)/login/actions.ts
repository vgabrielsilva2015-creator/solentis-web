'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(1),
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
    return { error: 'Preencha e-mail e senha.' }
  }

  try {
    await signIn('credentials', {
      email:       parsed.data.email,
      password:    parsed.data.password,
      redirectTo:  '/',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin':
          return { error: 'E-mail ou senha incorretos.' }
        case 'CallbackRouteError':
          // Rate limit ou conta inativa — mensagem do authorize()
          const msg = err.cause?.err?.message
          if (msg === 'RATE_LIMITED') {
            return { error: 'Muitas tentativas falhas. Tente novamente mais tarde.' }
          }
          return { error: msg ?? 'Acesso bloqueado temporariamente.' }
        default:
          return { error: 'Erro ao tentar entrar. Tente novamente.' }
      }
    }
    // signIn lança NEXT_REDIRECT internamente — relançar para o Next processar
    throw err
  }

  return {}
}
