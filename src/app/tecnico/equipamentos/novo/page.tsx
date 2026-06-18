import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { EquipmentForm } from './equipment-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovoEquipamentoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div>
        <BackButton href="/tecnico/equipamentos" label="Equipamentos" />
        <h1 className="text-xl font-semibold mt-1">Novo equipamento</h1>
      </div>

      <EquipmentForm categories={categories} />
    </main>
  )
}
