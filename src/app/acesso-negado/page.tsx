import { auth } from '@/lib/auth'
import { getDashboardRoute } from '@/lib/auth-utils'
import Link from 'next/link'

export default async function AcessoNegado() {
  const session = await auth()
  const home = session ? getDashboardRoute(session.user.role) : '/login'
  
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        <p className="text-5xl font-bold text-amber-400">403</p>
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-slate-400">Você não tem permissão para esta área.</p>
        <Link href={home} className="inline-block rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-400">
          Voltar ao meu painel
        </Link>
      </div>
    </main>
  )
}
