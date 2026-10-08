/**
 * T-30 — Configuração do Sentry (servidor). Pura e testável.
 *
 * Só liga com `SENTRY_DSN`. Sem DSN, nada é inicializado e nada sai da aplicação.
 * Sem dado pessoal por padrão: sem PII automático, sem corpo de requisição, sem
 * cookies/headers de autenticação, e e-mails mascarados em qualquer texto.
 */
import type { ErrorEvent } from '@sentry/nextjs'

const HEADERS_SENSIVEIS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-vercel-oidc-token']
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function mascararEmails(s: string): string {
  return s.replace(EMAIL, '[email]')
}

const CHAVES_COM_URL = new Set(['url', 'request_path', 'path', 'transaction'])

/** Percorre o evento todo: mascara e-mails em qualquer texto e corta `?query` de URLs/caminhos. */
function higienizar(valor: unknown, chave = '', fundo = 0): unknown {
  if (fundo > 12) return valor
  if (typeof valor === 'string') {
    const t = CHAVES_COM_URL.has(chave) ? valor.split('?')[0] : valor
    return mascararEmails(t)
  }
  if (Array.isArray(valor)) return valor.map((v) => higienizar(v, chave, fundo + 1))
  if (valor && typeof valor === 'object') {
    const o = valor as Record<string, unknown>
    for (const k of Object.keys(o)) o[k] = higienizar(o[k], k, fundo + 1)
    return o
  }
  return valor
}

/** Remove de um evento tudo o que pode identificar pessoa ou carregar credencial. */
export function limparEvento<T extends ErrorEvent>(event: T): T {
  // O Sentry guarda o que foi escrito no console como "migalha" (breadcrumb): ali moram
  // mensagens de erro com e-mail e a pilha inteira. Fora. As demais migalhas são higienizadas abaixo.
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.filter((b) => b.category !== 'console')
  if (event.request) {
    delete event.request.cookies
    delete event.request.data
    delete event.request.query_string
    if (event.request.headers) {
      for (const k of Object.keys(event.request.headers)) {
        if (HEADERS_SENSIVEIS.includes(k.toLowerCase())) delete event.request.headers[k]
      }
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined
  return higienizar(event) as T
}

export function opcoesSentry(env: NodeJS.ProcessEnv = process.env) {
  const taxa = Number(env.SENTRY_TRACES_SAMPLE_RATE)
  return {
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'dev',
    release: env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    // Rastreamento de desempenho desligado por padrão (custo/cota); liga por variável.
    tracesSampleRate: Number.isFinite(taxa) && taxa >= 0 && taxa <= 1 ? taxa : 0,
    beforeSend: limparEvento,
  }
}

export function sentryAtivo(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SENTRY_DSN)
}
