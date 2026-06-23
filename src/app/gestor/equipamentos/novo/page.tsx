import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { EquipmentForm } from './equipment-form'
import { BackButton } from '@/components/back-button'
import { PageHeader } from '@/components/ui/page-header'

export default async function GestorNovoEquipamentoPage() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <BackButton href="/gestor/equipamentos" label="Voltar para Equipamentos" />
        <PageHeader 
          title="Novo Equipamento" 
          description="Cadastre um novo ativo físico na infraestrutura."
        />
      </div>

      <div className="bg-surface-1 border border-border rounded-xl p-6 shadow-sm">
        <EquipmentForm categories={categories} />
      </div>
    </main>
  )
}
