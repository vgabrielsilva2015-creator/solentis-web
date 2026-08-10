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
  ShieldAlert,
  Wrench,
} from 'lucide-react'

// Lista única de navegação do Gestor — consumida pela sidebar (desktop) e
// pela página "Mais" (mobile). Não duplicar: editar só aqui.
export type GestorNavItem =
  | { type: 'link'; label: string; href: string; activePrefixes?: string[]; icon: React.ReactNode }
  | { type: 'section'; label: string }

export const GESTOR_NAV: GestorNavItem[] = [
  { type: 'section', label: 'Visão Geral' },
  { type: 'link',    label: 'Dashboard',               href: '/gestor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  
  { type: 'section', label: 'Operação' },
  { type: 'link',    label: 'Resultados',              href: '/gestor/leituras', activePrefixes: ['/gestor/leituras', '/gestor/analises', '/gestor/laudos'], icon: <Microscope className="w-4 h-4" /> },
  { type: 'link',    label: 'Ocorrências',             href: '/gestor/ocorrencias', activePrefixes: ['/gestor/ocorrencias', '/gestor/prazos-ocorrencia'], icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'link',    label: 'Turnos',                  href: '/gestor/turnos/tarefas', activePrefixes: ['/gestor/turnos'], icon: <Clock className="w-4 h-4" /> },
  
  { type: 'section', label: 'Gestão & Configuração' },
  { type: 'link',    label: 'Manutenção',              href: '/gestor/equipamentos', activePrefixes: ['/gestor/equipamentos', '/gestor/manutencao', '/gestor/categorias'], icon: <Wrench className="w-4 h-4" /> },
  { type: 'link',    label: 'Estoque',                 href: '/gestor/produtos-quimicos', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'link',    label: 'Sistema',                 href: '/gestor/parametros', activePrefixes: ['/gestor/parametros', '/gestor/pontos-de-coleta', '/gestor/relatorios', '/gestor/usuarios', '/gestor/auditoria', '/gestor/cronograma'], icon: <Settings className="w-4 h-4" /> },
]
