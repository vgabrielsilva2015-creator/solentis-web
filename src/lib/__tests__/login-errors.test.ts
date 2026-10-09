/**
 * T-03 — nenhuma falha de login pode mostrar detalhe interno (Prisma, host, porta, stack).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CallbackRouteError, CredentialsSignin, MissingSecret } from '@auth/core/errors'
import {
  loginErrorMessage,
  toUserMessage,
  UserFacingError,
  GENERIC_ERROR_MESSAGE,
  LOGIN_MESSAGES,
} from '@/lib/user-errors'

const signInMock = vi.fn()
vi.mock('@/lib/auth', () => ({ signIn: (...args: unknown[]) => signInMock(...args) }))
// next-auth reexporta AuthError do @auth/core; o mock evita carregar o runtime do Next no vitest
vi.mock('next-auth', async () => ({ AuthError: (await import('@auth/core/errors')).AuthError }))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }) }))

const { loginAction } = await import('@/app/(auth)/login/actions')

// O Auth.js cria o CallbackRouteError passando o erro original (vira `cause.err`);
// a tipagem pública só declara string, por isso o cast.
const callbackError = (cause: Error) => new CallbackRouteError(cause as unknown as string)

function form(email: string, password: string) {
  const fd = new FormData()
  fd.set('email', email)
  fd.set('password', password)
  return fd
}

const PRISMA_MSG = "\nInvalid `prisma.user.findUnique()` invocation:\n\nCan't reach database server at `aws-1-sa-east-1.pooler.supabase.com:6543`"
const VAZAMENTOS = [/prisma/i, /supabase/i, /6543/, /invocation/i, /ECONNREFUSED/i, /at \w+ \(/]

describe('mensagens de login (puras)', () => {
  it('credenciais inválidas', () => {
    expect(loginErrorMessage('CredentialsSignin')).toBe(LOGIN_MESSAGES.invalidCredentials)
  })
  it('rate limit reconhecido pelo código interno', () => {
    expect(loginErrorMessage('CallbackRouteError', 'RATE_LIMITED')).toBe(LOGIN_MESSAGES.rateLimited)
  })
  it('qualquer outra causa vira mensagem genérica, nunca a mensagem original', () => {
    expect(loginErrorMessage('CallbackRouteError', PRISMA_MSG)).toBe(LOGIN_MESSAGES.unavailable)
    expect(loginErrorMessage('Configuration', null)).toBe(LOGIN_MESSAGES.unavailable)
    expect(loginErrorMessage(undefined)).toBe(LOGIN_MESSAGES.unavailable)
  })
})

describe('toUserMessage', () => {
  it('repassa só mensagens escritas para o usuário', () => {
    expect(toUserMessage(new UserFacingError('Arquivo muito grande.'))).toBe('Arquivo muito grande.')
  })
  it('esconde mensagens técnicas', () => {
    expect(toUserMessage(new Error(PRISMA_MSG))).toBe(GENERIC_ERROR_MESSAGE)
    expect(toUserMessage('string solta')).toBe(GENERIC_ERROR_MESSAGE)
    expect(toUserMessage(null, 'Falhou.')).toBe('Falhou.')
  })
})

describe('loginAction (server action real, signIn simulado)', () => {
  beforeEach(() => signInMock.mockReset())

  it('banco fora do ar → mensagem genérica sem detalhe interno', async () => {
    signInMock.mockRejectedValueOnce(callbackError(new Error(PRISMA_MSG)))
    const res = await loginAction({}, form('operador@solentis.local', 'x'))
    expect(res.error).toBe(LOGIN_MESSAGES.unavailable)
    for (const re of VAZAMENTOS) expect(res.error).not.toMatch(re)
  })

  it('erro de configuração do Auth.js → mensagem genérica', async () => {
    signInMock.mockRejectedValueOnce(new MissingSecret('AUTH_SECRET ausente'))
    const res = await loginAction({}, form('a@b.com', 'x'))
    expect(res.error).toBe(LOGIN_MESSAGES.unavailable)
  })

  it('senha errada → mensagem de credenciais', async () => {
    signInMock.mockRejectedValueOnce(new CredentialsSignin())
    expect((await loginAction({}, form('a@b.com', 'x'))).error).toBe(LOGIN_MESSAGES.invalidCredentials)
  })

  it('rate limit → mensagem própria', async () => {
    signInMock.mockRejectedValueOnce(callbackError(new Error('RATE_LIMITED')))
    expect((await loginAction({}, form('a@b.com', 'x'))).error).toBe(LOGIN_MESSAGES.rateLimited)
  })

  it('entrada inválida não chama o signIn', async () => {
    expect((await loginAction({}, form('nao-e-email', ''))).error).toBe(LOGIN_MESSAGES.invalidInput)
    expect(signInMock).not.toHaveBeenCalled()
  })

  it('redirect de sucesso continua sendo propagado', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/;307;' })
    signInMock.mockRejectedValueOnce(redirect)
    await expect(loginAction({}, form('a@b.com', 'x'))).rejects.toBe(redirect)
  })
})
