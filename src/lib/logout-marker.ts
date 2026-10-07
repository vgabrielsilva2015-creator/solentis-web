/**
 * Marcador de logout (correção encontrada pelo E2E da T-15).
 *
 * A sessão JWT é renovada a cada requisição (cookie novo na resposta). Se uma
 * requisição de fundo (polling de notificações, prefetch, sincronização) estava
 * em andamento quando o usuário clicou em "Sair", a resposta dela chegava DEPOIS
 * do logout e regravava o cookie da sessão: o usuário "voltava" logado.
 * Reproduzido de forma intermitente (≈2 em 16 execuções) no E2E de tablet
 * compartilhado.
 *
 * Correção em duas camadas:
 *  1. Imediata: o logout grava este cookie com o `sid` da sessão encerrada. O
 *     proxy recusa qualquer cookie de sessão cujo sid esteja nele — mesmo que
 *     uma resposta atrasada tenha ressuscitado o cookie neste navegador.
 *  2. Servidor: o sid vai para `revoked_sessions`; a revalidação periódica
 *     (T-06) derruba cópias do cookie em OUTROS aparelhos em até 60 s.
 */
export const LOGOUT_MARKER_COOKIE = 'solentis_sessoes_encerradas'
export const LOGOUT_MARKER_MAX = 5
export const LOGOUT_MARKER_MAX_AGE_S = 13 * 60 * 60

const SID_RE = /^[A-Za-z0-9-]{8,64}$/

export function parseMarker(value: string | undefined | null): string[] {
  if (!value) return []
  return value.split('.').filter((s) => SID_RE.test(s)).slice(-LOGOUT_MARKER_MAX)
}

export function appendToMarker(value: string | undefined | null, sid: string): string {
  const atual = parseMarker(value).filter((s) => s !== sid)
  return [...atual, sid].slice(-LOGOUT_MARKER_MAX).join('.')
}

export function isLoggedOut(markerValue: string | undefined | null, sid: string | undefined | null): boolean {
  return !!sid && parseMarker(markerValue).includes(sid)
}

/** Nomes possíveis do cookie de sessão do Auth.js (http/https, com pedaços). */
export function sessionCookieNames(all: string[]): string[] {
  return all.filter((n) => /^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(n))
}
