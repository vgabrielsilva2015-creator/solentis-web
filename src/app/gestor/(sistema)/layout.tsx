import { TabsNav, TabItem } from '@/components/ui/tabs-nav'

const tabs: TabItem[] = [
  { label: 'Parâmetros (Limites)', href: '/gestor/parametros' },
  { label: 'Pontos de Coleta', href: '/gestor/pontos-de-coleta' },
  { label: 'Relatórios', href: '/gestor/relatorios' },
  { label: 'Usuários', href: '/gestor/usuarios' },
  { label: 'Agendamento de Análises', href: '/gestor/cronograma' },
  { label: 'Auditoria Global', href: '/gestor/auditoria' },
]

export default function SistemaLayout({
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
