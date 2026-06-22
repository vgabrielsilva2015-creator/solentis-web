import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { LayoutDashboard, FlaskConical, Wrench, AlertTriangle, Clock } from 'lucide-react'
import { TopNav } from '@/components/ui/top-nav'
import { NotificationBell } from '@/components/ui/notification-bell'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'

export default async function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const NAV_ITEMS: NavItem[] = [
    { href: '/tecnico/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/tecnico/analises',     label: 'Análises',     icon: FlaskConical    },
    { href: '/tecnico/equipamentos', label: 'Equip.',       icon: Wrench          },
    { href: '/tecnico/ocorrencias',  label: 'Ocorrências',  icon: AlertTriangle   },
    { href: '/tecnico/turnos/tarefas', label: 'Turnos', icon: Clock           },
  ]

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
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <NotificationBell />
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      {/* Conteúdo — pb-24 para não ficar atrás da bottom nav e notch */}
      <div className="pb-24">
        {children}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}
