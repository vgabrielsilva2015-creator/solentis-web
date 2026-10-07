// Limite de tentativas de login: src/lib/rate-limit.ts (T-10)
export const SESSION_MAX_AGE_OPERATOR = 30 * 60         // 30 min em segundos
export const SESSION_MAX_AGE_DEFAULT  = 60 * 60         // 60 min em segundos

export const ROUTE_ACCESS: Record<string, string[]> = {
  '/gestor':     ['MANAGER'],
  '/tecnico':    ['TECHNICIAN', 'MANAGER'],
  '/operador':   ['OPERATOR', 'TECHNICIAN', 'MANAGER'],
  '/manutencao': ['MAINTENANCE', 'MANAGER'],
  '/admin':      ['SUPER_ADMIN'],
}

export function getSessionMaxAge(role: string): number {
  return role === 'OPERATOR' ? SESSION_MAX_AGE_OPERATOR : SESSION_MAX_AGE_DEFAULT
}

export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin/plantas'
    case 'MANAGER':     return '/gestor/dashboard'
    case 'TECHNICIAN':  return '/tecnico/analises'
    case 'OPERATOR':    return '/operador/turnos'
    case 'MAINTENANCE': return '/manutencao/dashboard'
    default:            return '/login'
  }
}

export function isRouteAllowedForRole(pathname: string, userRole: string): boolean {
  if (userRole === 'SUPER_ADMIN') return true
  for (const [prefix, roles] of Object.entries(ROUTE_ACCESS)) {
    if (pathname.startsWith(prefix)) {
      return roles.includes(userRole)
    }
  }
  return true
}
