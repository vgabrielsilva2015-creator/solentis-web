/**
 * T-06 — sessão revogável: revalidação periódica, inatividade por perfil,
 * idade absoluta e session_version.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  guardSession,
  initialGuardFields,
  SESSION_REVALIDATE_SECONDS,
  SESSION_ABSOLUTE_MAX_SECONDS,
  type GuardedToken,
  type UserAccessState,
} from '@/lib/session-guard'
import { SESSION_MAX_AGE_OPERATOR, SESSION_MAX_AGE_DEFAULT } from '@/lib/auth-utils'

const T0 = 1_800_000_000

function token(over: Partial<GuardedToken> = {}): GuardedToken {
  return { sub: 'u1', role: 'MANAGER', tenantId: 'A', mustChangePassword: false, ...initialGuardFields(3, T0), ...over }
}
function state(over: Partial<UserAccessState> = {}): UserAccessState {
  return {
    is_active: true, deleted_at: null, role: 'MANAGER', tenant_id: 'A',
    session_version: 3, must_change_password: false, tenant_active: true, ...over,
  }
}

describe('guardSession', () => {
  const load = vi.fn<(id: string) => Promise<UserAccessState | null>>()
  beforeEach(() => { load.mockReset(); load.mockResolvedValue(state()) })

  it('dentro do intervalo não consulta o banco e renova lastSeen', async () => {
    const r = await guardSession(token(), T0 + 10, load)
    expect(r.ok).toBe(true)
    expect(load).not.toHaveBeenCalled()
    if (r.ok) expect(r.token.lastSeen).toBe(T0 + 10)
  })

  it(`passado o intervalo (${SESSION_REVALIDATE_SECONDS}s) consulta o banco e marca checkedAt`, async () => {
    const now = T0 + SESSION_REVALIDATE_SECONDS
    const r = await guardSession(token(), now, load)
    expect(load).toHaveBeenCalledWith('u1')
    expect(r.ok && r.token.checkedAt).toBe(now)
  })

  it('token anterior à T-06 (sem versão) é encerrado', async () => {
    const legacy: GuardedToken = { sub: 'u1', role: 'MANAGER', tenantId: 'A' }
    expect(await guardSession(legacy, T0, load)).toEqual({ ok: false, reason: 'legacy' })
  })

  describe('inatividade por perfil (antes não funcionava: o Auth.js sobrescrevia token.exp)', () => {
    it('operador cai após 30 min sem uso', async () => {
      load.mockResolvedValue(state({ role: 'OPERATOR' }))
      const t = token({ role: 'OPERATOR' })
      expect((await guardSession(t, T0 + SESSION_MAX_AGE_OPERATOR, load)).ok).toBe(true)
      expect(await guardSession(t, T0 + SESSION_MAX_AGE_OPERATOR + 1, load)).toEqual({ ok: false, reason: 'idle' })
    })
    it('gestor aguenta 30 min e cai após 60 min sem uso', async () => {
      expect((await guardSession(token(), T0 + SESSION_MAX_AGE_OPERATOR + 1, load)).ok).toBe(true)
      expect(await guardSession(token(), T0 + SESSION_MAX_AGE_DEFAULT + 1, load)).toEqual({ ok: false, reason: 'idle' })
    })
    it('uso contínuo mantém a sessão (renovação deslizante)', async () => {
      load.mockResolvedValue(state({ role: 'OPERATOR' }))
      let t = token({ role: 'OPERATOR' })
      for (let i = 1; i <= 10; i++) {
        const r = await guardSession(t, T0 + i * 20 * 60, load)
        expect(r.ok).toBe(true)
        if (r.ok) t = r.token
      }
    })
  })

  it('idade absoluta: 12 h desde o login, mesmo com uso contínuo', async () => {
    const t = token({ lastSeen: T0 + SESSION_ABSOLUTE_MAX_SECONDS })
    expect(await guardSession(t, T0 + SESSION_ABSOLUTE_MAX_SECONDS + 1, load)).toEqual({ ok: false, reason: 'absolute' })
  })

  describe('mudanças no banco derrubam a sessão na próxima revalidação', () => {
    const now = T0 + SESSION_REVALIDATE_SECONDS
    const casos: Array<[string, UserAccessState | null, string]> = [
      ['usuário apagado', null, 'not_found'],
      ['usuário desativado', state({ is_active: false }), 'inactive'],
      ['soft-delete', state({ deleted_at: new Date() }), 'inactive'],
      ['planta desativada', state({ tenant_active: false }), 'tenant_inactive'],
      ['papel trocado', state({ role: 'OPERATOR' }), 'role_changed'],
      ['planta trocada', state({ tenant_id: 'B' }), 'tenant_changed'],
      ['senha resetada/trocada (versão)', state({ session_version: 4 }), 'version_changed'],
    ]
    for (const [nome, st, reason] of casos) {
      it(nome, async () => {
        load.mockResolvedValueOnce(st)
        expect(await guardSession(token(), now, load)).toEqual({ ok: false, reason })
      })
    }
  })

  it('SUPER_ADMIN não cai por planta desativada', async () => {
    load.mockResolvedValueOnce(state({ role: 'SUPER_ADMIN', tenant_active: false }))
    const r = await guardSession(token({ role: 'SUPER_ADMIN' }), T0 + SESSION_REVALIDATE_SECONDS, load)
    expect(r.ok).toBe(true)
  })

  it('must_change_password vem do banco na revalidação', async () => {
    load.mockResolvedValueOnce(state({ must_change_password: true }))
    const r = await guardSession(token(), T0 + SESSION_REVALIDATE_SECONDS, load)
    expect(r.ok && r.token.mustChangePassword).toBe(true)
  })

  it('banco fora: mantém a sessão (fail-open) e tenta de novo na próxima', async () => {
    load.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const r = await guardSession(token(), T0 + SESSION_REVALIDATE_SECONDS, load)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.dbError).toBeInstanceOf(Error)
      expect(r.token.checkedAt).toBe(T0) // não marcou como conferido
    }
  })

  it('banco fora não impede a expiração por inatividade', async () => {
    load.mockRejectedValue(new Error('down'))
    expect(await guardSession(token({ role: 'OPERATOR' }), T0 + SESSION_MAX_AGE_OPERATOR + 1, load))
      .toEqual({ ok: false, reason: 'idle' })
  })
})

// ─── Callback jwt real (auth.config) ─────────────────────────────────────────
const loadMock = vi.fn()
vi.mock('@/lib/session-version', () => ({
  loadUserAccess: (id: string) => loadMock(id),
  BUMP_SESSION_VERSION: { session_version: { increment: 1 } },
}))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

describe('callback jwt do Auth.js', async () => {
  const { authConfig } = await import('@/lib/auth.config')
  const jwt = authConfig.callbacks.jwt as unknown as (a: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<Record<string, unknown> | null>

  it('no login grava versão, horário do login e conferência', async () => {
    const t = await jwt({ token: { sub: 'u1' }, user: { role: 'OPERATOR', mustChangePassword: false, tenantId: 'A', email: 'o@a', sessionVersion: 7 } })
    expect(t).toMatchObject({ sv: 7, role: 'OPERATOR', tenantId: 'A' })
    expect(typeof t?.loginAt).toBe('number')
  })

  it('devolve null (Auth.js apaga o cookie) quando a versão mudou', async () => {
    const now = Math.floor(Date.now() / 1000)
    loadMock.mockResolvedValueOnce(state({ session_version: 8, role: 'OPERATOR' }))
    const t = await jwt({ token: { sub: 'u1', role: 'OPERATOR', tenantId: 'A', sv: 7, loginAt: now - 100, lastSeen: now - 10, checkedAt: now - 120 } })
    expect(t).toBeNull()
  })
})

// ─── Guardião: escrita que muda acesso precisa incrementar a versão ─────────
describe('toda escrita que muda acesso do usuário incrementa session_version', () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(full, acc) }
      else if (/\.tsx?$/.test(e)) acc.push(full)
    }
    return acc
  }
  function args(text: string, open: number) {
    let d = 1, i = open + 1
    while (i < text.length && d) { if (text[i] === '(') d++; else if (text[i] === ')') d--; i++ }
    return text.slice(open + 1, i - 1)
  }

  it('password_hash / is_active / role / email em user.update* vêm com BUMP_SESSION_VERSION', () => {
    const faltando: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      const text = readFileSync(f, 'utf-8')
      const re = /(?:prisma|tx)\.user\.(?:update|updateMany)\s*\(/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text))) {
        const blk = args(text, m.index + m[0].length - 1)
        const data = blk.slice(blk.search(/\bdata\s*:/))
        if (/\b(password_hash|is_active|role|email)\s*:/.test(data) && !/BUMP_SESSION_VERSION|session_version/.test(data)) {
          faltando.push(`${f}:${text.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(faltando).toEqual([])
  })
})
