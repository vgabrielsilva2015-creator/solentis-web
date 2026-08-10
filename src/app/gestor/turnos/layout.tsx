import { TabsNav, TabItem } from '@/components/ui/tabs-nav'

const tabs: TabItem[] = [
  { label: 'Tarefas', href: '/gestor/turnos/tarefas' },
  { label: 'Escala', href: '/gestor/turnos/escala' },
  { label: 'Configuração', href: '/gestor/turnos' },
]

export default function TurnosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <TabsNav tabs={tabs} />
      {children}
    </div>
  )
}
