import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ROLE_PREFIXES, getDashboardRoute } from '@/lib/auth-utils'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Rotas públicas: login e troca de senha não exigem sessão
  if (pathname.startsWith('/login')) {
    // Usuário já autenticado não precisa ver a página de login
    if (session) {
      const dest = session.user.mustChangePassword
        ? '/trocar-senha'
        : getDashboardRoute(session.user.role)
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Rota de troca de senha: exige sessão (qualquer perfil)
  if (pathname.startsWith('/trocar-senha')) {
    if (!session) return redirectToLogin(req)
    return NextResponse.next()
  }

  // Todas as demais rotas protegidas exigem sessão
  if (!session) return redirectToLogin(req)

  // Usuário com senha provisória só pode acessar /trocar-senha
  if (session.user.mustChangePassword) {
    return NextResponse.redirect(new URL('/trocar-senha', req.url))
  }

  // Verifica permissão por prefixo de rota
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      if (session.user.role === 'SUPER_ADMIN') {
        break // Super Admin tem acesso a tudo
      }
      if (session.user.role !== requiredRole) {
        return NextResponse.redirect(new URL('/acesso-negado', req.url))
      }
      if (requiredRole === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/acesso-negado', req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// Aplica o middleware a todas as rotas exceto assets estáticos e API do NextAuth
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
