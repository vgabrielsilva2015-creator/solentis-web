import pino from 'pino'
import { headers } from 'next/headers'

/**
 * Logger estruturado (JSON) para observabilidade.
 *
 * - Emite JSON no stdout — na Vercel cai direto no painel "Logs", filtrável por campo.
 * - Pino é Node-only: não use em código com runtime Edge. No Next 16 o proxy
 *   (src/proxy.ts), as Server Actions e as rotas de API rodam em Node.
 * - Em dev, para ler mais fácil: `npm run dev | npx pino-pretty` (não plugamos o
 *   transport pino-pretty aqui de propósito — worker thread quebra no bundle do Next).
 *
 * Níveis: trace < debug < info < warn < error < fatal.
 *   fatal  — app não sobe / dependência crítica fora (DB indisponível)
 *   error  — exceção que quebrou a operação do usuário
 *   warn   — degradação tolerada (retry, fail-open, notificação não enviada)
 *   info   — evento de negócio relevante concluído
 */

const isProd = process.env.NODE_ENV === 'production'

// T-21: dados pessoais (e-mail, destinatário, telefone) também nunca vão para o log.
export const REDACT_PATHS = [
  'password', 'senha', 'password_hash', 'passwordHash',
  'token', 'reset_token', 'resetToken', 'tempPassword', 'temp_password',
  'authorization', 'cookie', 'set-cookie', 'secret',
  'totp', 'recovery', 'recoveryCodes', 'secret_enc', 'segredo',
  '*.password', '*.senha', '*.password_hash', '*.passwordHash',
  '*.token', '*.reset_token', '*.resetToken', '*.tempPassword',
  '*.authorization', '*.cookie', '*.secret',
  '*.totp', '*.recovery', '*.recoveryCodes', '*.secret_enc', '*.segredo',
  'headers.authorization', 'headers.cookie',
  'email', 'to', 'phone', 'telefone', '*.email', '*.to', '*.phone', '*.telefone',
]

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  base: {
    app: 'solentis',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'dev',
  },
  // Emite o nível como string ("error") em vez de número (50).
  formatters: {
    level: (label) => ({ level: label }),
  },
  // ─── DATA MASKING (LGPD / segredos) ───────────────────────────────────────
  // Qualquer campo abaixo, em qualquer objeto logado, vira [REDACTED].
  // Nunca gravar senha, hash, token ou credencial no log.
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
})

export type LogContext = {
  userId?: string | null
  tenantId?: string | null
  action?: string
  [key: string]: unknown
}

/**
 * Logger-filho com contexto de requisição (userId, tenantId, action + requestId).
 * Correlaciona todas as linhas de uma mesma requisição pelo `requestId`
 * (usa o `x-vercel-id` da Vercel quando disponível).
 *
 * Nunca lança: um logger que quebra a aplicação é pior que log nenhum.
 */
export async function getLogger(ctx: LogContext = {}) {
  let requestId: string
  try {
    const h = await headers()
    requestId = h.get('x-vercel-id') ?? crypto.randomUUID()
  } catch {
    // headers() só existe em escopo de requisição; fora dele, geramos um id.
    requestId = crypto.randomUUID()
  }
  return logger.child({ requestId, ...ctx })
}
