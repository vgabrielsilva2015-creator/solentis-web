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
  | { type: 'link'; label: string; href: string; excludePrefix?: string; icon: React.ReactNode }
  | { type: 'section'; label: string }

export const GESTOR_NAV: GestorNavItem[] = [
  { type: 'link',    label: 'Dashboard',               href: '/gestor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { type: 'link',    label: 'Usuários',                 href: '/gestor/usuarios', icon: <Users className="w-4 h-4" /> },
  { type: 'section', label: 'Configurações' },
  { type: 'link',    label: 'Agendamento de Análises',  href: '/gestor/cronograma', icon: <Settings className="w-4 h-4" /> },
  { type: 'link',    label: 'Parâmetros (Limites)',     href: '/gestor/parametros', icon: <Settings className="w-4 h-4" /> },
  { type: 'link',    label: 'Categorias',               href: '/gestor/categorias', icon: <Tags className="w-4 h-4" /> },
  { type: 'link',    label: 'Pontos de Coleta',         href: '/gestor/pontos-de-coleta', icon: <MapPin className="w-4 h-4" /> },
  { type: 'link',    label: 'Turnos',                   href: '/gestor/turnos', excludePrefix: '/gestor/turnos/tarefas', icon: <Clock className="w-4 h-4" /> },
  { type: 'link',    label: 'Escala de Turnos',         href: '/gestor/turnos/escala', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Tarefas do Turno',         href: '/gestor/turnos/tarefas', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Prazos de Ocorrência',     href: '/gestor/prazos-ocorrencia', icon: <Timer className="w-4 h-4" /> },
  { type: 'section', label: 'Estoque' },
  { type: 'link',    label: 'Produtos Químicos',        href: '/gestor/produtos-quimicos', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'section', label: 'Operação' },
  { type: 'link',    label: 'Coletas de Campo',         href: '/gestor/leituras', icon: <FileCheck2 className="w-4 h-4" /> },
  { type: 'link',    label: 'Análises Internas',        href: '/gestor/analises', icon: <Microscope className="w-4 h-4" /> },
  { type: 'link',    label: 'Laudos Externos',          href: '/gestor/laudos', icon: <UploadCloud className="w-4 h-4" /> },
  { type: 'link',    label: 'Ocorrências',              href: '/gestor/ocorrencias', icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'section', label: 'Manutenção' },
  { type: 'link',    label: 'Equipamentos',             href: '/gestor/equipamentos', icon: <Wrench className="w-4 h-4" /> },
  { type: 'link',    label: 'Preventivas',              href: '/gestor/manutencao/preventivas', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Corretivas',               href: '/gestor/manutencao/corretivas', icon: <Wrench className="w-4 h-4" /> },
  { type: 'section', label: 'Governança' },
  { type: 'link',    label: 'Relatórios',               href: '/gestor/relatorios', icon: <ScrollText className="w-4 h-4" /> },
  { type: 'section', label: 'Sistema' },
  { type: 'link',    label: 'Auditoria Global',         href: '/gestor/auditoria', icon: <ShieldAlert className="w-4 h-4" /> },
]
