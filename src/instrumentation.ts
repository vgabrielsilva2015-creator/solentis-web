/**
 * Hook de instrumentação do Next.js — executa uma vez no startup do servidor.
 *
 * A Vercel reserva a env var `TZ` (não dá para setar pelo painel) e roda o
 * Node em UTC. Definimos o fuso da operação aqui, no início do processo, para
 * que TODAS as formatações de data/hora no servidor (toLocale*, etc.) usem o
 * horário de Brasília sem precisar passar timeZone em cada chamada.
 *
 * T-30: se `SENTRY_DSN` estiver definida (e só então), inicializa o Sentry no
 * servidor Node. Sem DSN nada é carregado nem enviado.
 */
export async function register() {
  process.env.TZ = 'America/Sao_Paulo'

  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs')
    const { opcoesSentry } = await import('@/lib/sentry-config')
    Sentry.init(opcoesSentry())
  }
}

/** Erros não tratados de renderização/rotas vão para o Sentry (quando ligado). */
export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
