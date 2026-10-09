/** Sessão simulada para os testes de integração: `actAs(usuario)` / `actAs(null)` (sem login). */
import { vi } from 'vitest'
import { auth } from '@/lib/auth'

export function actAs(user: { id: string; tenant_id: string; role?: string; email?: string } | null) {
  const mock = vi.mocked(auth) as unknown as { mockResolvedValue: (v: unknown) => void }
  mock.mockResolvedValue(
    user ? { user: { id: user.id, tenantId: user.tenant_id, role: user.role, email: user.email }, expires: '2999-01-01' } : null,
  )
}

/** Executa e devolve a URL do redirect lançado (ou null se não houve). */
export async function redirecionou(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null } catch (e) {
    const m = e instanceof Error ? /^NEXT_REDIRECT:(.*)$/.exec(e.message) : null
    if (m) return m[1]
    throw e
  }
}

export function form(campos: Record<string, string | undefined>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) f.set(k, v)
  return f
}
