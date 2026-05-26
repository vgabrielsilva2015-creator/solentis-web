import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.mustChangePassword) redirect('/trocar-senha')
  redirect(getDashboardRoute(session.user.role))
}
