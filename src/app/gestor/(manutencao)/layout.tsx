import { TabsNav, TabItem } from '@/components/ui/tabs-nav'

const tabs: TabItem[] = [
  { label: 'Equipamentos', href: '/gestor/equipamentos' },
  { label: 'Preventivas', href: '/gestor/manutencao/preventivas' },
  { label: 'Corretivas', href: '/gestor/manutencao/corretivas' },
  { label: 'Categorias', href: '/gestor/categorias' },
]

export default function ManutencaoLayout({
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
