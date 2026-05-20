export const RATE_LIMIT_MAX_ATTEMPTS  = 5
export const RATE_LIMIT_WINDOW_MS     = 15 * 60 * 1000 // 15 minutos
export const SESSION_MAX_AGE_OPERATOR = 30 * 60         // 30 min em segundos
export const SESSION_MAX_AGE_DEFAULT  = 60 * 60         // 60 min em segundos

export const ROLE_PREFIXES: Record<string, string> = {
  '/gestor':   'MANAGER',
  '/tecnico':  'TECHNICIAN',
  '/operador': 'OPERATOR',
}

export function isRateLimited(recentFailures: number): boolean {
  return recentFailures >= RATE_LIMIT_MAX_ATTEMPTS
}

export function getSessionMaxAge(role: string): number {
  return role === 'OPERATOR' ? SESSION_MAX_AGE_OPERATOR : SESSION_MAX_AGE_DEFAULT
}

export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/dashboard'
    default:           return '/login'
  }
}

export function isRouteAllowedForRole(pathname: string, userRole: string): boolean {
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      return userRole === requiredRole
    }
  }
  return true
}
