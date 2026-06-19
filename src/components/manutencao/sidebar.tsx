'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Wrench,
  AlertTriangle
} from 'lucide-react'

type NavItem = {
  type: 'link'
  label: string
  href: string
  icon: React.ReactNode
} | {
  type: 'divider'
} | {
  type: 'title'
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { type: 'title',   label: 'Visão Geral' },
  { type: 'link',    label: 'Dashboard',           href: '/manutencao/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  
  { type: 'divider' },
  
  { type: 'title',   label: 'Operação' },
  { type: 'link',    label: 'Preventivas',         href: '/manutencao/preventivas', icon: <Wrench className="w-4 h-4" /> },
  { type: 'link',    label: 'Corretivas',          href: '/manutencao/corretivas', icon: <AlertTriangle className="w-4 h-4" /> },
]

export function ManutencaoSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
      {NAV_ITEMS.map((item, idx) => {
        if (item.type === 'divider') {
          return <hr key={idx} className="my-4 border-slate-800" />
        }
        if (item.type === 'title') {
          return (
            <h4 key={idx} className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {item.label}
            </h4>
          )
        }
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={idx}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600/10 text-blue-400'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
