'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Factory,
  LayoutDashboard,
  Shield,
  ScrollText,
} from 'lucide-react'

type NavItem =
  | { type: 'link'; label: string; href: string; icon: React.ReactNode }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link', label: 'Painel Geral', href: '/admin/plantas', icon: <LayoutDashboard className="w-4 h-4" /> },
  { type: 'section', label: 'Gestão' },
  { type: 'link', label: 'Plantas (ETEs)', href: '/admin/plantas', icon: <Factory className="w-4 h-4" /> },
  { type: 'section', label: 'Sistema' },
  { type: 'link', label: 'Auditoria Global', href: '/admin/auditoria', icon: <ScrollText className="w-4 h-4" /> },
  { type: 'link', label: 'Segurança', href: '/admin/seguranca', icon: <Shield className="w-4 h-4" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {item.label}
            </p>
          )
        }
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-indigo-600/20 font-medium text-indigo-300 border border-indigo-500/20'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
