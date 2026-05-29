import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { EquipmentForm } from './equipment-form'

const TENANT_ID = 'default'

export default async function NovoEquipamentoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tecnico/equipamentos" className="text-sm text-slate-400 hover:text-slate-200">
          ← Equipamentos
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-xl font-semibold">Novo equipamento</h1>
      </div>

      <EquipmentForm categories={categories} />
    </main>
  )
}
