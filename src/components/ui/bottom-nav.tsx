'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  href:  string
  label: string
  icon:  LucideIcon
}

type BottomNavProps = {
  items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/60 pb-safe lg:hidden"
      aria-label="Navegação principal"
    >
      <ul className="flex h-14">
        {items.map(({ href, label, icon: Icon }) => {
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
