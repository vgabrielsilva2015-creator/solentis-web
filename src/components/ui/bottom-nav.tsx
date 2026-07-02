'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FlaskConical,
  Wrench,
  AlertTriangle,
  Clock,
  Droplets,
  Package,
  CalendarDays,
  MoreHorizontal,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  href:  string
  label: string
  iconName: 'LayoutDashboard' | 'FlaskConical' | 'Wrench' | 'AlertTriangle' | 'Clock' | 'Droplets' | 'Package' | 'CalendarDays' | 'MoreHorizontal'
}

const ICON_MAP: Record<NavItem['iconName'], LucideIcon> = {
  LayoutDashboard,
  FlaskConical,
  Wrench,
  AlertTriangle,
  Clock,
  Droplets,
  Package,
  CalendarDays,
  MoreHorizontal,
}

type BottomNavProps = {
  items: NavItem[]
  /** Cor de acento do item ativo (por área). Default: aqua do operador. */
  accent?: string
}

export function BottomNav({ items, accent = '#3ad0d6' }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/60 pb-safe lg:hidden"
      aria-label="Navegação principal"
    >
      <ul className="flex h-16">
        {items.map(({ href, label, iconName }) => {
          const Icon = ICON_MAP[iconName]
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                style={isActive ? { color: accent, borderTopColor: accent } : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-transform active:scale-95',
                  isActive ? '' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Barra-pílula do item ativo */}
                {isActive && (
                  <span
                    className="absolute top-0 h-1 w-[30px] -translate-y-1/2 rounded-full"
                    style={{ background: accent }}
                  />
                )}
                <Icon size={23} strokeWidth={isActive ? 2 : 1.5} />
                <span
                  className={cn(
                    'text-[11px] leading-none font-medium tracking-wide',
                    !isActive && 'text-muted-foreground',
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
