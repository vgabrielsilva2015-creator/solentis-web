import { describe, it, expect } from 'vitest'
import { isRouteAllowedForRole, getDashboardRoute } from '@/lib/auth-utils'

/**
 * Fase 4 — Blindagem do RBAC.
 * Matriz completa de acesso por área × perfil, incluindo os perfis novos
 * (MAINTENANCE, SUPER_ADMIN) e as áreas /manutencao e /admin.
 *
 * `true`  = perfil PODE acessar a área
 * `false` = perfil é BLOQUEADO (deve cair em /acesso-negado)
 */

type Role = 'OPERATOR' | 'TECHNICIAN' | 'MANAGER' | 'MAINTENANCE' | 'SUPER_ADMIN'

const ALL_ROLES: Role[] = ['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE', 'SUPER_ADMIN']

// Rota representativa de cada área protegida.
const AREAS = {
  '/gestor/dashboard':       'gestor',
  '/tecnico/analises':       'tecnico',
  '/operador/leituras':      'operador',
  '/manutencao/preventivas': 'manutencao',
  '/admin/plantas':          'admin',
} as const

// Verdade esperada do negócio (matriz de permissões).
const EXPECTED: Record<keyof typeof AREAS, Record<Role, boolean>> = {
  '/gestor/dashboard': {
    OPERATOR: false, TECHNICIAN: false, MANAGER: true, MAINTENANCE: false, SUPER_ADMIN: true,
  },
  '/tecnico/analises': {
    OPERATOR: false, TECHNICIAN: true, MANAGER: true, MAINTENANCE: false, SUPER_ADMIN: true,
  },
  '/operador/leituras': {
    OPERATOR: true, TECHNICIAN: true, MANAGER: true, MAINTENANCE: false, SUPER_ADMIN: true,
  },
  '/manutencao/preventivas': {
    OPERATOR: false, TECHNICIAN: false, MANAGER: true, MAINTENANCE: true, SUPER_ADMIN: true,
  },
  '/admin/plantas': {
    OPERATOR: false, TECHNICIAN: false, MANAGER: false, MAINTENANCE: false, SUPER_ADMIN: true,
  },
}

describe('RBAC — matriz completa de acesso por área × perfil', () => {
  for (const route of Object.keys(AREAS) as (keyof typeof AREAS)[]) {
    for (const role of ALL_ROLES) {
      const expected = EXPECTED[route][role]
      it(`${role} ${expected ? 'PODE' : 'NÃO pode'} acessar ${route}`, () => {
        expect(isRouteAllowedForRole(route, role)).toBe(expected)
      })
    }
  }

  it('SUPER_ADMIN acessa qualquer rota (inclusive áreas de outros perfis)', () => {
    expect(isRouteAllowedForRole('/gestor/usuarios', 'SUPER_ADMIN')).toBe(true)
    expect(isRouteAllowedForRole('/operador/turnos', 'SUPER_ADMIN')).toBe(true)
    expect(isRouteAllowedForRole('/manutencao/corretivas', 'SUPER_ADMIN')).toBe(true)
  })

  it('MANAGER NÃO acessa a área de SUPER_ADMIN (/admin)', () => {
    expect(isRouteAllowedForRole('/admin/plantas', 'MANAGER')).toBe(false)
    expect(isRouteAllowedForRole('/admin/seguranca', 'MANAGER')).toBe(false)
  })

  it('Sub-rotas profundas respeitam o prefixo da área', () => {
    expect(isRouteAllowedForRole('/manutencao/equipamentos/abc', 'OPERATOR')).toBe(false)
    expect(isRouteAllowedForRole('/manutencao/equipamentos/abc', 'MAINTENANCE')).toBe(true)
    expect(isRouteAllowedForRole('/gestor/manutencao/corretivas/nova', 'TECHNICIAN')).toBe(false)
  })
})

describe('RBAC — rota inicial (getDashboardRoute) por perfil', () => {
  const CASES: [Role | string, string][] = [
    ['SUPER_ADMIN', '/admin/plantas'],
    ['MANAGER',     '/gestor/dashboard'],
    ['TECHNICIAN',  '/tecnico/analises'],
    ['OPERATOR',    '/operador/turnos'],
    ['MAINTENANCE', '/manutencao/dashboard'],
    ['DESCONHECIDO', '/login'],
  ]

  for (const [role, dest] of CASES) {
    it(`${role} → ${dest}`, () => {
      expect(getDashboardRoute(role)).toBe(dest)
    })
  }
})
