/**
 * Limites de tentativa para login e pedido de redefinição de senha (T-10).
 *
 * Antes: 5 falhas em 15 min para um E-MAIL bloqueavam a conta, vindas de
 * qualquer IP. Qualquer pessoa conseguia trancar o login de um operador só
 * digitando senha errada com o e-mail dele (lockout destrutivo). E-mails
 * inexistentes nem eram contados, e o pedido de reset não tinha limite.
 *
 * Agora (janela deslizante de 15 min para login, 1 h para reset):
 *  - IP:          muitas falhas do mesmo IP → bloqueia aquele IP (o atacante).
 *  - e-mail + IP: 5 falhas do mesmo IP para o mesmo e-mail → bloqueia o par.
 *                 O dono da conta, em outro aparelho/rede, continua entrando.
 *  - e-mail:      falhas vindas de vários IPs NÃO bloqueiam; só atrasam cada
 *                 tentativa seguinte (1 s, 2 s, 4 s… até 8 s).
 *  - reset:       3 pedidos/h por e-mail e 10/h por IP; acima disso o pedido é
 *                 ignorado em silêncio — a resposta é sempre a mesma.
 *
 * Os contadores ficam em `auth_rate_events` (sem tenant: o e-mail ainda não foi
 * resolvido para uma planta). O e-mail entra como hash, nunca em texto.
 * Falha do banco aqui é fail-open (decisão já registrada para o login).
 */
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_IP_FAIL_LIMIT = 30
export const LOGIN_PAIR_FAIL_LIMIT = 5
export const LOGIN_EMAIL_DELAY_FROM = 5
export const LOGIN_MAX_DELAY_MS = 8000

export const RESET_WINDOW_MS = 60 * 60 * 1000
export const RESET_EMAIL_LIMIT = 3
export const RESET_IP_LIMIT = 10

export const PWCHANGE_WINDOW_MS = 15 * 60 * 1000
export const PWCHANGE_FAIL_LIMIT = 5

const RETENTION_MS = 24 * 60 * 60 * 1000

export function emailKey(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)
}

export const buckets = {
  loginIp: (ip: string) => `login:ip:${ip}`,
  loginPair: (email: string, ip: string) => `login:pair:${emailKey(email)}:${ip}`,
  loginEmail: (email: string) => `login:email:${emailKey(email)}`,
  resetIp: (ip: string) => `reset:ip:${ip}`,
  resetEmail: (email: string) => `reset:email:${emailKey(email)}`,
  passwordChange: (userId: string) => `pwchange:user:${userId}`,
}

// ─── Política (pura, testável) ─────────────────────────────────────────────

export interface LoginCounts { ip: number; pair: number; email: number }
export interface LoginDecision { blocked: boolean; delayMs: number }

export function decideLogin(c: LoginCounts): LoginDecision {
  if (c.ip >= LOGIN_IP_FAIL_LIMIT || c.pair >= LOGIN_PAIR_FAIL_LIMIT) return { blocked: true, delayMs: 0 }
  if (c.email < LOGIN_EMAIL_DELAY_FROM) return { blocked: false, delayMs: 0 }
  const delay = 1000 * 2 ** (c.email - LOGIN_EMAIL_DELAY_FROM)
  return { blocked: false, delayMs: Math.min(delay, LOGIN_MAX_DELAY_MS) }
}

export function resetAllowed(counts: { ip: number; email: number }): boolean {
  return counts.ip < RESET_IP_LIMIT && counts.email < RESET_EMAIL_LIMIT
}

// ─── IP do cliente ─────────────────────────────────────────────────────────

/**
 * Na Vercel, `x-vercel-forwarded-for`/`x-forwarded-for` são escritos pela borda
 * (o valor enviado pelo cliente é descartado). Fora da Vercel o cabeçalho pode ser
 * forjado — o limite por IP só é confiável atrás da Vercel.
 */
export function clientIp(h: Pick<Headers, 'get'> | undefined | null): string {
  if (!h) return 'unknown'
  const raw = h.get('x-vercel-forwarded-for') ?? h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? ''
  const first = raw.split(',')[0]?.trim()
  return first && first.length <= 64 ? first : 'unknown'
}

// ─── Persistência ──────────────────────────────────────────────────────────

export async function countRecent(bucket: string, windowMs: number): Promise<number> {
  return prisma.authRateEvent.count({
    where: { bucket, created_at: { gte: new Date(Date.now() - windowMs) } },
  })
}

export async function recordEvents(bucketNames: string[]): Promise<void> {
  await prisma.authRateEvent.createMany({ data: bucketNames.map((bucket) => ({ bucket })) })
  // Limpeza oportunista: ~2% das gravações apagam eventos com mais de 24 h.
  if (Math.random() < 0.02) {
    await prisma.authRateEvent.deleteMany({ where: { created_at: { lt: new Date(Date.now() - RETENTION_MS) } } })
  }
}

export async function loginCounts(email: string, ip: string): Promise<LoginCounts> {
  const [ipN, pairN, emailN] = await Promise.all([
    countRecent(buckets.loginIp(ip), LOGIN_WINDOW_MS),
    countRecent(buckets.loginPair(email, ip), LOGIN_WINDOW_MS),
    countRecent(buckets.loginEmail(email), LOGIN_WINDOW_MS),
  ])
  return { ip: ipN, pair: pairN, email: emailN }
}

export function recordLoginFailure(email: string, ip: string): Promise<void> {
  return recordEvents([buckets.loginIp(ip), buckets.loginPair(email, ip), buckets.loginEmail(email)])
}

/** Conta e registra o pedido de reset; devolve se ele pode seguir. */
export async function takeResetSlot(email: string, ip: string): Promise<boolean> {
  const [ipN, emailN] = await Promise.all([
    countRecent(buckets.resetIp(ip), RESET_WINDOW_MS),
    countRecent(buckets.resetEmail(email), RESET_WINDOW_MS),
  ])
  await recordEvents([buckets.resetIp(ip), buckets.resetEmail(email)])
  return resetAllowed({ ip: ipN, email: emailN })
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
