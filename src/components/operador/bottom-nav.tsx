'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Droplets, Clock, AlertTriangle, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href:  string
  label: string
  icon:  LucideIcon
}

const NAV: NavItem[] = [
  { href: '/operador/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/operador/leituras',    label: 'Leituras',    icon: Droplets        },
  { href: '/operador/turnos',      label: 'Turnos',      icon: Clock           },
  { href: '/operador/ocorrencias', label: 'Ocorrências', icon: AlertTriangle   },
  { href: '/operador/estoque',     label: 'Estoque',     icon: Package         },
]

export function OperadorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800"
      aria-label="Navegação principal"
    >
      <ul className="flex h-14">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors',
                  isActive
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span
                  className={cn(
                    'text-[10px] leading-none font-medium tracking-wide',
                    !isActive && 'text-slate-600',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
