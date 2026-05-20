'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem =
  | { type: 'link'; label: string; href: string }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link',    label: 'Dashboard',           href: '/gestor/dashboard' },
  { type: 'link',    label: 'Usuários',             href: '/gestor/usuarios' },
  { type: 'section', label: 'Configurações' },
  { type: 'link',    label: 'Parâmetros',           href: '/gestor/parametros' },
  { type: 'link',    label: 'Métodos de Análise',   href: '/gestor/metodos' },
  { type: 'link',    label: 'Categorias',           href: '/gestor/categorias' },
  { type: 'link',    label: 'Pontos de Coleta',     href: '/gestor/pontos-de-coleta' },
  { type: 'link',    label: 'Turnos',               href: '/gestor/turnos' },
  { type: 'link',    label: 'Prazos de Ocorrência', href: '/gestor/prazos-ocorrencia' },
]

export function GestorSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              {item.label}
            </p>
          )
        }
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-slate-800 font-medium text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
