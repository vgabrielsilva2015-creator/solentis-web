/**
 * T-18 — B-08 (restante) — links das notificações por perfil e alerta de passagem vencida ao gestor.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { notificationTaskHref, HANDOVER_ALERT_HREF } from '@/lib/notification-links'
import { hrefFor } from '@/lib/search'
import { isRouteAllowedForRole } from '@/lib/auth-utils'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ─── B-08 (notificações) ─────────────────────────────────────────────────────
describe('B-08: links das notificações', () => {
  const base = join(process.cwd(), 'src/app')
  /** Resolve /a/b/c para um page.tsx, passando por grupos (x) e segmentos [id]. */
  function telaExiste(href: string): boolean {
    const partes = href.split('/').filter(Boolean)
    const busca = (dir: string, i: number): boolean => {
      if (!existsSync(dir)) return false
      const entradas = readdirSync(dir)
      if (i === partes.length) {
        if (entradas.includes('page.tsx')) return true
        return entradas.some((e) => /^\(.+\)$/.test(e) && busca(join(dir, e), i))
      }
      return entradas.some((e) => {
        const full = join(dir, e)
        if (!statSync(full).isDirectory()) return false
        if (e === partes[i] || /^\[[^.\]]+\]$/.test(e)) return busca(full, i + 1)
        if (/^\(.+\)$/.test(e)) return busca(full, i)
        return false
      })
    }
    return busca(base, 0)
  }

  const casos: Array<[string, string]> = []
  for (const role of ['OPERATOR', 'TECHNICIAN', 'MANAGER']) {
    const occ = hrefFor(role, 'occurrence', 'abc'); if (occ) casos.push([role, occ])
    const eq = hrefFor(role, 'equipment', 'abc'); if (eq) casos.push([role, eq])
    casos.push([role, notificationTaskHref(role, 'abc')])
  }
  casos.push(['MANAGER', HANDOVER_ALERT_HREF('abc')])

  it.each(casos)('%s → %s é permitido ao perfil e a tela existe', (role, href) => {
    expect(isRouteAllowedForRole(href, role)).toBe(true)
    expect(telaExiste(href)).toBe(true)
  })

  it('o resolvedor de telas recusa rota inexistente', () => expect(telaExiste('/gestor/nao-existe/abc')).toBe(false))

  it('notifications.ts não monta caminho de tela à mão', () => {
    const t = semComentarios(src('app/actions/notifications.ts'))
    expect(t).not.toMatch(/['`]\/(gestor|tecnico|operador|manutencao)\//)
  })

  it('gestor recebe alerta de passagem vencida (briefing, seção E)', () => {
    const t = semComentarios(src('app/actions/notifications.ts'))
    expect(t).toMatch(/type:\s*'HANDOVER'/)
    expect(t).toMatch(/timeout_at:\s*\{\s*lt:/)
  })
})
