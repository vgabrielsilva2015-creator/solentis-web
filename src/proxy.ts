import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextRequest, NextResponse } from 'next/server'
import { isRouteAllowedForRole, getDashboardRoute } from '@/lib/auth-utils'

const { auth } = NextAuth(authConfig)

// Rotas públicas de autenticação — acessíveis SEM sessão (recuperar/definir
// senha, convite, cadastro). Sem isso, o usuário deslogado que clica no link
// de "esqueci senha" ou no link de convite/reset por e-mail é jogado ao login.
const PUBLIC_AUTH_PATHS = ['/forgot', '/reset', '/signup', '/verify-email', '/invite']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Rotas públicas de auth: liberadas independentemente de sessão
  if (PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Rotas públicas: login e troca de senha não exigem sessão
  if (pathname.startsWith('/login')) {
    // Usuário já autenticado não precisa ver a página de login
    if (session && session.user) {
      const dest = session.user.mustChangePassword
        ? '/trocar-senha'
        : getDashboardRoute(session.user.role)
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Rota de troca de senha: exige sessão (qualquer perfil)
  if (pathname.startsWith('/trocar-senha')) {
    if (!session || !session.user) return redirectToLogin(req)
    return NextResponse.next()
  }

  // Todas as demais rotas protegidas exigem sessão
  if (!session || !session.user) return redirectToLogin(req)

  // Usuário com senha provisória só pode acessar /trocar-senha
  if (session.user.mustChangePassword) {
    return NextResponse.redirect(new URL('/trocar-senha', req.url))
  }

  // Verifica permissão por papel para as rotas
  if (!isRouteAllowedForRole(pathname, session.user.role)) {
    return NextResponse.redirect(new URL('/acesso-negado', req.url))
  }

  return NextResponse.next()
})

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// Aplica o middleware a todas as rotas exceto a API do NextAuth, o cron de
// sistema, internos do Next e QUALQUER arquivo com extensão (manifest.json,
// sw.js, ícones, imagens). Antes, manifest.json e sw.js eram redirecionados ao
// login, quebrando o PWA.
// `api/cron` é excluído porque roda sem sessão (Vercel Cron manda apenas
// `Authorization: Bearer <CRON_SECRET>`); o próprio handler faz a auth
// fail-closed. Sem essa exclusão, o middleware redirecionava o cron ao /login
// e o handler nunca executava.
export const config = {
  matcher: ['/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
