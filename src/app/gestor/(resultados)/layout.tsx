import { TabsNav, TabItem } from '@/components/ui/tabs-nav'

const tabs: TabItem[] = [
  { label: 'Coletas de Campo', href: '/gestor/leituras' },
  { label: 'Análises Internas', href: '/gestor/analises' },
  { label: 'Laudos Externos', href: '/gestor/laudos' },
]

export default function ResultadosLayout({
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
