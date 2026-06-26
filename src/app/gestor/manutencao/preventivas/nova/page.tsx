import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { PreventivaForm } from './preventiva-form'

export default async function NovaPreventivaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  const equipment = await prisma.equipment.findMany({
    where: { tenant_id, is_active: true },
    select: { id: true, name: true, serial_number: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <Link 
        href="/gestor/manutencao/preventivas" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Preventivas
      </Link>

      <PageHeader 
        title="Nova Manutenção Preventiva" 
        description="Agende uma nova manutenção para um equipamento."
      />

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm p-6">
        {equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum equipamento cadastrado. Cadastre um equipamento primeiro em{' '}
            <Link href="/gestor/equipamentos/novo" className="text-primary underline">Equipamentos</Link>.
          </p>
        ) : (
          <PreventivaForm equipment={equipment} />
        )}
      </div>
    </main>
  )
}
