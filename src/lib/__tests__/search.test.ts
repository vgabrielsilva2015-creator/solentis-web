/**
 * T-17 — busca: perfis, links e padrão de busca.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { allowedTypes, hrefFor, likePattern, excerpt, SEARCH_ROUTES } from '@/lib/search'
import { isRouteAllowedForRole } from '@/lib/auth-utils'

describe('o que cada perfil busca', () => {
  it('gestor: equipamentos, pontos e ocorrências', () => expect(allowedTypes('MANAGER').sort()).toEqual(['equipment', 'occurrence', 'point']))
  it('operador: só ocorrências', () => expect(allowedTypes('OPERATOR')).toEqual(['occurrence']))
  it('manutenção: só equipamentos', () => expect(allowedTypes('MAINTENANCE')).toEqual(['equipment']))
  it('super admin e perfil desconhecido: nada', () => {
    expect(allowedTypes('SUPER_ADMIN')).toEqual([])
    expect(allowedTypes('X')).toEqual([])
  })
})

describe('links', () => {
  it('todo link leva a uma tela que o próprio perfil pode abrir', () => {
    for (const [role, tipos] of Object.entries(SEARCH_ROUTES)) {
      for (const tipo of Object.keys(tipos)) {
        const href = hrefFor(role, tipo as never, 'abc')!
        expect(isRouteAllowedForRole(href, role), `${role} → ${href}`).toBe(true)
      }
    }
  })
  it('toda tela de destino existe no app', () => {
    const base = join(process.cwd(), 'src/app')
    const existe = (href: string) => {
      const partes = href.split('/').filter(Boolean)
      const candidatos = [
        join(base, ...partes.slice(0, -1), '[id]', 'page.tsx'),
        join(base, partes[0], '(manutencao)', ...partes.slice(1, -1), '[id]', 'page.tsx'),
        join(base, partes[0], '(ocorrencias)', ...partes.slice(1, -1), '[id]', 'page.tsx'),
        join(base, partes[0], '(sistema)', ...partes.slice(1, -1), '[id]', 'page.tsx'),
      ]
      return candidatos.some(existsSync)
    }
    for (const [role, tipos] of Object.entries(SEARCH_ROUTES)) {
      for (const tipo of Object.keys(tipos)) {
        const href = hrefFor(role, tipo as never, 'abc')!
        expect(existe(href), href).toBe(true)
      }
    }
  })
  it('tipo que o perfil não pode ver não gera link', () => expect(hrefFor('OPERATOR', 'equipment', 'x')).toBeNull())
})

describe('likePattern', () => {
  it('termo curto ou gigante não busca', () => {
    expect(likePattern('a')).toBeNull()
    expect(likePattern('x'.repeat(81))).toBeNull()
  })
  it('curingas digitados são literais', () => {
    expect(likePattern('100%')).toBe('%100\\%%')
    expect(likePattern('a_b')).toBe('%a\\_b%')
  })
  it('espaços normalizados', () => expect(likePattern('  bomba   dosadora ')).toBe('%bomba dosadora%'))
  it('resumo corta com reticências', () => expect(excerpt('a'.repeat(100), 10)).toHaveLength(10))
})

describe('rota de busca', () => {
  const src = readFileSync(join(process.cwd(), 'src/app/api/search/route.ts'), 'utf-8')
  it('ignora maiúsculas e acentos com a mesma expressão dos índices de trigrama', () => {
    expect(src).toMatch(/public\.f_unaccent\(lower\(/)
  })
  it('exige sessão e filtra por tenant', () => {
    expect(src).toMatch(/status: 401/)
    expect(src.match(/tenant_id = \$\{tenantId\}/g)?.length).toBe(3)
  })
})
