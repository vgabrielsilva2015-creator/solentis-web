import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { GestorSidebar } from '@/components/gestor/sidebar'

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/gestor/dashboard" className="text-lg font-bold tracking-tight hover:text-slate-300 transition-colors">Solentis</Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Gestor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <GestorSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
