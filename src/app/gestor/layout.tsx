import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { GestorSidebar } from '@/components/gestor/sidebar'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'
import { ThemeToggle } from '@/components/theme-provider'
import { NotificationBell } from '@/components/ui/notification-bell'

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mobile: padrão "4 + Mais" (a sidebar completa tem ~20 itens, só no desktop).
  const NAV_ITEMS: NavItem[] = [
    { href: '/gestor/dashboard',    label: 'Início',       iconName: 'LayoutDashboard' },
    { href: '/gestor/ocorrencias',  label: 'Ocorrências',  iconName: 'AlertTriangle'   },
    { href: '/gestor/analises',     label: 'Análises',     iconName: 'FlaskConical'     },
    { href: '/gestor/equipamentos', label: 'Equip.',       iconName: 'Wrench'           },
    { href: '/gestor/mais',         label: 'Mais',         iconName: 'MoreHorizontal'   },
  ]

  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/gestor/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Gestor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <ThemeToggle />
            <NotificationBell />
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-[244px] shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <GestorSidebar />
        </aside>

        {/* Conteúdo — pb-24 no mobile para não ficar atrás da bottom nav */}
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </div>
      </div>

      {/* Barra inferior (mobile): 4 + Mais */}
      <BottomNav items={NAV_ITEMS} accent="#a78bfa" />
    </div>
  )
}
