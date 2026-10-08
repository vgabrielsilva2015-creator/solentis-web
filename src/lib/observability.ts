/**
 * T-30 — Observabilidade das operações críticas.
 *
 * `medir` / `comMedicao` envolvem uma Server Action (por composição, sem alterar o
 * contrato dela) e registram, em log estruturado, `action`, `durationMs` e `outcome`.
 * Ação lenta vira `warn`; exceção real vira `error` e vai para o Sentry (se houver DSN)
 * e é relançada — o comportamento da ação não muda.
 *
 * O que NÃO é erro e passa direto: `redirect()` e `notFound()` do Next (são exceções de
 * controle de fluxo) e o retorno `{ error: '...' }` de validação (é resposta normal).
 *
 * Nada de PII: só nome da ação, duração, resultado, tenantId e userId (ids opacos).
 */
import { getLogger } from '@/lib/logger'

/** Acima disto a ação é registrada como `warn` (lenta). Ajustável sem deploy de código. */
export function limiteLentoMs(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.SLOW_ACTION_MS)
  return Number.isFinite(n) && n > 0 ? n : 2000
}

/** Exceções de controle de fluxo do Next (redirect/notFound): não são falha. */
export function ehFluxoDoNext(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const digest = (err as { digest?: unknown }).digest
  if (typeof digest !== 'string') return false
  return digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') || digest === 'NEXT_NOT_FOUND'
}

export type Desfecho = 'ok' | 'erro' | 'redirect'

export function classificarDuracao(durationMs: number, limiteMs: number): 'info' | 'warn' {
  return durationMs >= limiteMs ? 'warn' : 'info'
}

async function contextoDoUsuario(): Promise<{ userId?: string; tenantId?: string }> {
  try {
    // `getActor` é memoizado por requisição: depois de a ação autenticar, não custa outra consulta.
    const { getActor } = await import('@/server/auth/guards')
    const a = await getActor()
    return { userId: a.userId, tenantId: a.tenantId }
  } catch {
    return {}
  }
}

async function capturar(err: unknown, nome: string, ctx: { userId?: string; tenantId?: string }) {
  if (!process.env.SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err, {
      tags: { action: nome, ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}) },
      ...(ctx.userId ? { user: { id: ctx.userId } } : {}),
    })
  } catch {
    // observabilidade nunca derruba a operação
  }
}

export async function medir<T>(nome: string, fn: () => Promise<T>): Promise<T> {
  const inicio = performance.now()
  let desfecho: Desfecho = 'ok'
  let falha: unknown
  try {
    return await fn()
  } catch (err) {
    if (ehFluxoDoNext(err)) {
      desfecho = 'redirect'
    } else {
      desfecho = 'erro'
      falha = err
    }
    throw err
  } finally {
    const durationMs = Math.round(performance.now() - inicio)
    // fire-and-forget seguro: nada aqui lança
    void registrar(nome, desfecho, durationMs, falha)
  }
}

async function registrar(nome: string, desfecho: Desfecho, durationMs: number, falha: unknown) {
  try {
    const ctx = desfecho === 'redirect' ? {} : await contextoDoUsuario()
    const log = await getLogger({ action: nome, ...ctx })
    if (desfecho === 'erro') {
      log.error({ err: falha, durationMs, outcome: desfecho }, 'Ação falhou')
      await capturar(falha, nome, ctx)
      return
    }
    const nivel = classificarDuracao(durationMs, limiteLentoMs())
    if (nivel === 'warn') log.warn({ durationMs, outcome: desfecho }, 'Ação lenta')
    else log.info({ durationMs, outcome: desfecho }, 'Ação concluída')
  } catch {
    // idem
  }
}

/** Envolve uma função (Server Action) mantendo a assinatura. Use por composição. */
export function comMedicao<A extends unknown[], R>(
  nome: string,
  impl: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return (...args: A) => medir(nome, () => impl(...args))
}

// ─── Batimento do cron ────────────────────────────────────────────────────────

/**
 * Avisa um monitor externo (padrão do Healthchecks.io: GET na URL = ok, `/fail` = falhou)
 * de que o cron rodou. Só age se `CRON_HEARTBEAT_URL` estiver configurada. Nunca lança e
 * nunca espera mais de 3 s. Não leva dado algum no pedido.
 */
export async function baterCoracaoDoCron(ok: boolean, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const base = env.CRON_HEARTBEAT_URL
  if (!base) return false
  try {
    const url = new URL(ok ? base : `${base.replace(/\/+$/, '')}/fail`)
    if (url.protocol !== 'https:') return false
    const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000), cache: 'no-store' })
    return r.ok
  } catch {
    return false
  }
}
