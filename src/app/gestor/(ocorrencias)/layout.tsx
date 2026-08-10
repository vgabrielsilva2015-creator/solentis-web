import { TabsNav, TabItem } from '@/components/ui/tabs-nav'

const tabs: TabItem[] = [
  { label: 'Quadro Geral', href: '/gestor/ocorrencias' },
  { label: 'Prazos SLA', href: '/gestor/prazos-ocorrencia' },
]

export default function OcorrenciasLayout({
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
