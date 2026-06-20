'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users,
  Settings, 
  Microscope,
  Tags,
  MapPin,
  Clock,
  CalendarDays,
  Timer,
  FlaskConical,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  ScrollText,
  ShieldAlert
} from 'lucide-react'

type NavItem =
  | { type: 'link'; label: string; href: string; excludePrefix?: string; icon: React.ReactNode }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link',    label: 'Dashboard',           href: '/gestor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { type: 'link',    label: 'Usuários',             href: '/gestor/usuarios', icon: <Users className="w-4 h-4" /> },
  { type: 'section', label: 'Configurações' },
  { type: 'link',    label: 'Plano de Monitoramento', href: '/gestor/parametros', icon: <Settings className="w-4 h-4" /> },
  { type: 'link',    label: 'Categorias',           href: '/gestor/categorias', icon: <Tags className="w-4 h-4" /> },
  { type: 'link',    label: 'Turnos',               href: '/gestor/turnos', excludePrefix: '/gestor/turnos/tarefas', icon: <Clock className="w-4 h-4" /> },
  { type: 'link',    label: 'Tarefas do Turno',  href: '/gestor/turnos/tarefas', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Prazos de Ocorrência', href: '/gestor/prazos-ocorrencia', icon: <Timer className="w-4 h-4" /> },
  { type: 'section', label: 'Estoque' },
  { type: 'link',    label: 'Produtos Químicos',   href: '/gestor/produtos-quimicos', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'section', label: 'Operação' },
  { type: 'link',    label: 'Análises Internas',    href: '/gestor/analises', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'link',    label: 'Laudos Externos',      href: '/gestor/laudos/importar', icon: <UploadCloud className="w-4 h-4" /> },
  { type: 'link',    label: 'Leituras Realizadas',  href: '/gestor/leituras', icon: <FileCheck2 className="w-4 h-4" /> },
  { type: 'link',    label: 'Ocorrências',         href: '/gestor/ocorrencias', icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'link',    label: 'Relatórios (Auditoria)', href: '/gestor/relatorios', icon: <ScrollText className="w-4 h-4" /> },
  { type: 'section', label: 'Sistema' },
  { type: 'link',    label: 'Auditoria Global',     href: '/gestor/auditoria', icon: <ShieldAlert className="w-4 h-4" /> },
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

