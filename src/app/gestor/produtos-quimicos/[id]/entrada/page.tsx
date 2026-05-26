import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EntryForm } from './entry-form'

const TENANT_ID = 'default'

export default async function EntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID, is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <Link
          href={`/gestor/produtos-quimicos/${id}`}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← {product.name}
        </Link>
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Registrar Entrada</h1>
        <p className="text-sm text-slate-400 mt-0.5">Compra ou recebimento de estoque</p>
      </div>
      <EntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </div>
  )
}
