/**
 * Política única de mensagens de erro para o usuário.
 *
 * Regra: nada técnico chega à tela (Prisma, host, porta, stack, nomes de tabela,
 * mensagens de SDK). O detalhe vai para o log do servidor; o usuário recebe uma
 * mensagem fixa em português.
 *
 * - `UserFacingError`: erro lançado de propósito, cuja mensagem foi escrita para o
 *   usuário (ex.: "Arquivo muito grande"). É o ÚNICO tipo cuja mensagem é repassada.
 * - `toUserMessage(err, fallback)`: devolve a mensagem segura para qualquer erro.
 */

export const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir a operação agora. Tente novamente em instantes.'

export class UserFacingError extends Error {
  readonly userFacing = true
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export function isUserFacingError(err: unknown): err is UserFacingError {
  return err instanceof UserFacingError || (!!err && typeof err === 'object' && (err as { userFacing?: unknown }).userFacing === true)
}

export function toUserMessage(err: unknown, fallback: string = GENERIC_ERROR_MESSAGE): string {
  return isUserFacingError(err) ? err.message : fallback
}

// ─── Login ─────────────────────────────────────────────────────────────────────

export const LOGIN_MESSAGES = {
  invalidCredentials: 'E-mail ou senha incorretos.',
  rateLimited: 'Muitas tentativas falhas. Tente novamente mais tarde.',
  unavailable: 'Não foi possível entrar agora. Tente novamente em instantes.',
  invalidInput: 'Preencha e-mail e senha.',
} as const

/** Código interno lançado pelo `authorize` quando o limite de tentativas é atingido. */
export const LOGIN_RATE_LIMITED_CODE = 'RATE_LIMITED'

/** Código interno lançado pelo `authorize` quando o banco falha (detalhe fica no log). */
export const LOGIN_UNAVAILABLE_CODE = 'AUTH_UNAVAILABLE'

/**
 * Traduz o resultado de um `signIn` que falhou numa mensagem segura.
 * `type` é o `AuthError.type` do Auth.js; `causeCode` é a mensagem do erro lançado
 * dentro do `authorize` (só códigos conhecidos são reconhecidos — o resto vira genérico).
 */
export function loginErrorMessage(type: string | undefined, causeCode?: string | null): string {
  if (type === 'CredentialsSignin') return LOGIN_MESSAGES.invalidCredentials
  if (type === 'CallbackRouteError' && causeCode === LOGIN_RATE_LIMITED_CODE) return LOGIN_MESSAGES.rateLimited
  return LOGIN_MESSAGES.unavailable
}
