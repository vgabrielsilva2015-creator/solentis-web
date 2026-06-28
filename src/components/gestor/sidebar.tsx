'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GESTOR_NAV as NAV } from './nav-items'

export function GestorSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono"
            >
              {item.label}
            </p>
          )
        }
        const isActive =
          (pathname === item.href || pathname.startsWith(item.href + '/')) &&
          (!item.excludePrefix || !pathname.startsWith(item.excludePrefix))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'font-semibold border border-[var(--brand)]/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
            style={
              isActive
                ? {
                    color: 'var(--brand)',
                    backgroundColor: 'var(--brand-soft)',
                  }
                : undefined
            }
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

