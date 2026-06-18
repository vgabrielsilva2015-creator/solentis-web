import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { AdminSidebar } from '@/components/admin/sidebar'
import { MobileNav } from '@/components/mobile-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNav><AdminSidebar /></MobileNav>
            <Link href="/admin/plantas" className="text-lg font-bold tracking-tight hover:text-slate-300 transition-colors">
              Solentis
            </Link>
            <span className="rounded-full bg-indigo-900/60 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
              Super Admin
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
        {/* Sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <AdminSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
