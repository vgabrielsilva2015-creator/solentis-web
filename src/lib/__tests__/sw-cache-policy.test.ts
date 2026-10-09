/**
 * T-12 — o service worker só guarda o que é igual para todo mundo.
 */
import { describe, it, expect, vi } from 'vitest'
import { cacheStrategyFor, LEGACY_USER_DATA_CACHES } from '@/lib/sw-cache-policy'
import { clearLocalUserData, DRAFT_KEYS } from '@/lib/client-cleanup'

// fila offline antiga (T-01/T-15) e preferência de tema: nunca apagadas no logout
const PRESERVED_KEYS = ['solentis_offline_leituras', 'theme']

const ORIGIN = 'https://solentis.app'
const req = (path: string, o: { mode?: string; rsc?: boolean; prefetch?: boolean; origin?: string } = {}) => {
  const h = new Headers()
  if (o.rsc) h.set('RSC', '1')
  if (o.prefetch) h.set('Next-Router-Prefetch', '1')
  const url = new URL(path, o.origin ?? ORIGIN)
  return cacheStrategyFor({ url, sameOrigin: url.origin === ORIGIN, mode: o.mode ?? 'cors', headers: h })
}

describe('cacheStrategyFor', () => {
  it('telas autenticadas nunca são guardadas (navegação, RSC e prefetch, todos os perfis)', () => {
    for (const p of ['/operador/turnos', '/tecnico/analises', '/gestor/dashboard', '/manutencao/dashboard', '/admin/plantas', '/trocar-senha', '/']) {
      expect(req(p, { mode: 'navigate' })).toBe('network-only')
      expect(req(p, { rsc: true })).toBe('network-only')
      expect(req(p, { rsc: true, prefetch: true })).toBe('network-only')
      expect(req(p)).toBe('network-only')
    }
  })

  it('API e fotos de rota autenticada vão sempre para a rede', () => {
    expect(req('/api/occurrences/abc/photo')).toBe('network-only')
    expect(req('/api/notifications')).toBe('network-only')
    expect(req('/_next/image?url=%2Fapi%2Foccurrences%2Fx%2Fphoto&w=640&q=75')).toBe('network-only')
  })

  it('outra origem (ex.: Blob) nunca entra no cache', () => {
    expect(req('https://x.public.blob.vercel-storage.com/a.jpg', { origin: 'https://x.public.blob.vercel-storage.com' })).toBe('network-only')
  })

  it('arquivos de build e estáticos do /public podem ser guardados', () => {
    expect(req('/_next/static/chunks/app/layout-123.js')).toBe('immutable')
    expect(req('/_next/static/css/abc.css')).toBe('immutable')
    expect(req('/icons/icon-192.png')).toBe('static')
    expect(req('/manifest.webmanifest')).toBe('static')
  })

  it('arquivo "estático" com query string não é guardado (pode ser dinâmico)', () => {
    expect(req('/relatorio.css?tenant=A')).toBe('network-only')
  })

  it('caches antigos com dados de usuário estão na lista de remoção', () => {
    expect(LEGACY_USER_DATA_CACHES).toEqual(expect.arrayContaining(['pages-rsc', 'pages-rsc-prefetch', 'others', 'apis']))
  })
})

describe('clearLocalUserData (logout)', () => {
  it('apaga caches e rascunhos, preserva a fila offline antiga e o tema', async () => {
    const store = new Map<string, string>()
    for (const k of [...DRAFT_KEYS, ...PRESERVED_KEYS]) store.set(k, 'x')
    vi.stubGlobal('window', { localStorage: { removeItem: (k: string) => store.delete(k) } })
    const deleted: string[] = []
    vi.stubGlobal('caches', { keys: async () => ['pages-rsc', 'solentis-static'], delete: async (n: string) => { deleted.push(n); return true } })
    await clearLocalUserData()
    expect(deleted).toEqual(['pages-rsc', 'solentis-static'])
    expect([...store.keys()].sort()).toEqual([...PRESERVED_KEYS].sort())
    vi.unstubAllGlobals()
  })

  it('não quebra o logout se o navegador negar acesso ao armazenamento', async () => {
    vi.stubGlobal('caches', { keys: async () => { throw new Error('SecurityError') } })
    vi.stubGlobal('window', { localStorage: { removeItem: () => { throw new Error('denied') } } })
    await expect(clearLocalUserData()).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })
})
