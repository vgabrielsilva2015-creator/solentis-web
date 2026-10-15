import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'
import { mfaExigeCadastro, mfaMode } from '@/lib/mfa/config'
import { LandingPage } from '@/components/landing/landing-page'

const LANDING_TITLE = 'Solentis — Sistema de operação para ETE'
const LANDING_DESC =
  'Leituras, análises com limites, estoque químico, ocorrências, manutenção e turnos da sua estação de tratamento de efluentes em um só lugar.'

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESC,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Solentis',
    title: LANDING_TITLE,
    description: LANDING_DESC,
    images: [{ url: '/landing/solentis-logo.png', alt: 'Solentis' }],
  },
  twitter: {
    card: 'summary',
    title: LANDING_TITLE,
    description: LANDING_DESC,
    images: ['/landing/solentis-logo.png'],
  },
}

export default async function Home() {
  const session = await auth()

  // Usuário logado: segue para o app (fluxo preservado — trocar senha / MFA / dashboard).
  if (session) {
    if (session.user.mustChangePassword) redirect('/trocar-senha')
    if (mfaExigeCadastro(session.user.role, session.user.mfa, mfaMode())) redirect('/mfa/cadastro')
    redirect(getDashboardRoute(session.user.role))
  }

  // Visitante não logado: landing pública (tema claro escopado).
  return (
    <div className="landing-scope">
      <LandingPage />
    </div>
  )
}
