import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'
import { mfaExigeCadastro, mfaMode } from '@/lib/mfa/config'
import { LandingPage } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'Solentis — Sistema de operação para ETE',
  description:
    'Leituras, análises com limites, estoque químico, ocorrências, manutenção e turnos da sua estação de tratamento de efluentes em um só lugar.',
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
