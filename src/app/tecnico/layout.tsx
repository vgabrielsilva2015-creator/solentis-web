import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { TecnicoBottomNav } from '@/components/tecnico/bottom-nav'
import { TopNav } from '@/components/ui/top-nav'
import { Logo } from '@/components/logo'

export default async function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/tecnico/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-sky-900/60 px-2.5 py-0.5 text-xs font-medium text-sky-400">
              Técnico
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      {/* Conteúdo — pb-16 para não ficar atrás da bottom nav */}
      <div className="pb-16">
        {children}
      </div>

      <TecnicoBottomNav />
    </div>
  )
}
