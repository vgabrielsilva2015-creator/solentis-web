/**
 * Revalidação periódica da sessão JWT (T-06).
 *
 * O JWT é assinado no login e, sem isto, carrega papel, planta e "precisa trocar
 * senha" congelados até expirar — e a renovação deslizante faz ele nunca expirar
 * enquanto houver uso. Esta camada roda dentro do callback `jwt` do Auth.js (no
 * proxy e em cada `auth()`), e:
 *
 *  1. expira por INATIVIDADE conforme o perfil (operador 30 min, demais 60 min);
 *  2. expira por IDADE ABSOLUTA (12 h desde o login), mesmo com uso contínuo;
 *  3. a cada SESSION_REVALIDATE_SECONDS, confere no banco se o usuário continua
 *     ativo, no mesmo papel e planta, com a planta ativa e com a mesma
 *     `session_version`. Qualquer divergência derruba a sessão.
 *
 * `session_version` é incrementada (bumpSessionVersion) quando o acesso do
 * usuário muda: desativação, troca de papel/e-mail, reset ou troca de senha.
 *
 * Falha do banco durante a revalidação NÃO derruba a sessão (fail-open, igual à
 * decisão do rate limit no login): a checagem é refeita na próxima requisição.
 * Os limites de inatividade e idade absoluta continuam valendo sem banco.
 */
import { getSessionMaxAge } from '@/lib/auth-utils'

export const SESSION_REVALIDATE_SECONDS = 60
export const SESSION_ABSOLUTE_MAX_SECONDS = 12 * 60 * 60

/** Campos que a revalidação lê/escreve no token. */
export interface GuardedToken {
  sub?: string
  role?: string
  tenantId?: string
  mustChangePassword?: boolean
  /** session_version do usuário no momento do login */
  sv?: number
  /** epoch (s) do login */
  loginAt?: number
  /** epoch (s) da última requisição autenticada */
  lastSeen?: number
  /** epoch (s) da última conferência no banco */
  checkedAt?: number
  [key: string]: unknown
}

/** Estado atual do usuário no banco (null = não existe). */
export interface UserAccessState {
  is_active: boolean
  deleted_at: Date | null
  role: string
  tenant_id: string
  session_version: number
  must_change_password: boolean
  tenant_active: boolean
}

export type AccessLoader = (userId: string) => Promise<UserAccessState | null>

export type RevokeReason =
  | 'idle'
  | 'absolute'
  | 'legacy'
  | 'not_found'
  | 'inactive'
  | 'tenant_inactive'
  | 'role_changed'
  | 'tenant_changed'
  | 'version_changed'

export type GuardResult =
  | { ok: true; token: GuardedToken; dbError?: unknown }
  | { ok: false; reason: RevokeReason }

/** Campos iniciais no login. */
export function initialGuardFields(sessionVersion: number, nowSec: number) {
  return { sv: sessionVersion, loginAt: nowSec, lastSeen: nowSec, checkedAt: nowSec }
}

export async function guardSession(
  token: GuardedToken,
  nowSec: number,
  loadAccess: AccessLoader,
): Promise<GuardResult> {
  // Token emitido antes da T-06 (sem versão): força novo login uma única vez.
  if (typeof token.sv !== 'number' || typeof token.loginAt !== 'number' || !token.sub) {
    return { ok: false, reason: 'legacy' }
  }

  const role = token.role ?? ''
  const lastSeen = typeof token.lastSeen === 'number' ? token.lastSeen : token.loginAt
  if (nowSec - lastSeen > getSessionMaxAge(role)) return { ok: false, reason: 'idle' }
  if (nowSec - token.loginAt > SESSION_ABSOLUTE_MAX_SECONDS) return { ok: false, reason: 'absolute' }

  const next: GuardedToken = { ...token, lastSeen: nowSec }
  const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0
  if (nowSec - checkedAt < SESSION_REVALIDATE_SECONDS) return { ok: true, token: next }

  let state: UserAccessState | null
  try {
    state = await loadAccess(token.sub)
  } catch (dbError) {
    // fail-open: mantém a sessão e tenta de novo na próxima requisição
    return { ok: true, token: next, dbError }
  }

  if (!state) return { ok: false, reason: 'not_found' }
  if (!state.is_active || state.deleted_at) return { ok: false, reason: 'inactive' }
  if (state.role !== 'SUPER_ADMIN' && !state.tenant_active) return { ok: false, reason: 'tenant_inactive' }
  if (state.role !== token.role) return { ok: false, reason: 'role_changed' }
  if (state.tenant_id !== token.tenantId) return { ok: false, reason: 'tenant_changed' }
  if (state.session_version !== token.sv) return { ok: false, reason: 'version_changed' }

  return {
    ok: true,
    token: { ...next, checkedAt: nowSec, mustChangePassword: state.must_change_password },
  }
}
