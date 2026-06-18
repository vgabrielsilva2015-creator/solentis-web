import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EntryForm } from './entry-form'
import { getTenantId } from '@/lib/tenant'


export default async function EntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href={`/gestor/produtos-quimicos/${id}`} label={product.name} />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Registrar Entrada</h1>
        <p className="text-sm text-slate-400 mt-0.5">Compra ou recebimento de estoque</p>
      </div>
      <EntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </div>
  )
}
