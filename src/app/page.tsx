import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'
import { mfaExigeCadastro, mfaMode } from '@/lib/mfa/config'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.mustChangePassword) redirect('/trocar-senha')
  if (mfaExigeCadastro(session.user.role, session.user.mfa, mfaMode())) redirect('/mfa/cadastro')
  redirect(getDashboardRoute(session.user.role))
}
