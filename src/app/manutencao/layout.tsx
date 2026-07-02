import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { ManutencaoSidebar } from '@/components/manutencao/sidebar'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'

export default async function ManutencaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const NAV_ITEMS: NavItem[] = [
    { href: '/manutencao/dashboard',   label: 'Início',      iconName: 'LayoutDashboard' },
    { href: '/manutencao/preventivas', label: 'Preventivas', iconName: 'Wrench'          },
    { href: '/manutencao/corretivas',  label: 'Corretivas',  iconName: 'AlertTriangle'   },
    { href: '/manutencao/escala',      label: 'Escalas',     iconName: 'CalendarDays'    },
  ]

  const session = await auth()
  // Manutenção e Gestor podem acessar (gestor vê tudo), alinhado ao proxy
  // (ROUTE_ACCESS['/manutencao']) e às telas internas da área.
  if (!session || !['MAINTENANCE', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/manutencao/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-blue-900/60 px-2.5 py-0.5 text-xs font-medium text-blue-400">
              Manutenção
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground">
              {session.user.name ?? session.user.email}
            </span>
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-card/50">
          <ManutencaoSidebar />
        </aside>

        {/* Conteúdo — pb-24 no mobile para não ficar atrás da bottom nav */}
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </div>
      </div>

      {/* Barra inferior (mobile) */}
      <BottomNav items={NAV_ITEMS} accent="#5eead4" />
    </div>
  )
}
