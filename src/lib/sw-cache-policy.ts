/**
 * Política de cache do service worker (T-12). Arquivo puro, sem APIs do worker,
 * para ser testado no vitest e importado pelo src/app/sw.ts.
 *
 * Regra: só vai para o cache o que é IGUAL para todo mundo (arquivos de build e
 * arquivos estáticos do /public, da própria origem). Tudo o que pode carregar
 * dado de usuário — páginas, payload RSC (navegação client-side e prefetch),
 * API, fotos servidas por rota autenticada, imagens otimizadas de origem
 * privada, qualquer coisa de outra origem — vai SEMPRE para a rede.
 *
 * Antes: o defaultCache do Serwist guardava o RSC das telas autenticadas em
 * "pages-rsc"/"pages-rsc-prefetch" e o resto em "others"; o filtro existente só
 * cobria navegação (não RSC) e esquecia /manutencao. Num tablet compartilhado,
 * o operador seguinte (ou alguém offline) via dados do anterior.
 */

export type CacheStrategy = 'immutable' | 'static' | 'network-only'

/** Caches de versões anteriores do SW que podiam conter dados de usuário. */
export const LEGACY_USER_DATA_CACHES = [
  'pages-rsc', 'pages-rsc-prefetch', 'pages', 'others', 'apis', 'next-data',
  'static-data-assets', 'cross-origin', 'next-image', 'static-image-assets',
]

const STATIC_EXT = /\.(?:woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|avif|css|js|webmanifest)$/i

export interface RequestInfo {
  url: URL
  sameOrigin: boolean
  mode?: string
  headers?: { get(name: string): string | null }
}

export function cacheStrategyFor({ url, sameOrigin, mode, headers }: RequestInfo): CacheStrategy {
  if (!sameOrigin) return 'network-only'
  if (mode === 'navigate') return 'network-only'
  if (headers?.get('RSC') === '1' || headers?.get('Next-Router-Prefetch') === '1') return 'network-only'
  if (url.search && !url.pathname.startsWith('/_next/static/')) return 'network-only'
  const p = url.pathname
  if (p.startsWith('/api/') || p.startsWith('/_next/image')) return 'network-only'
  if (p.startsWith('/_next/static/')) return 'immutable'
  if (STATIC_EXT.test(p)) return 'static'
  return 'network-only'
}
