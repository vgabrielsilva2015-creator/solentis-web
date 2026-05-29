import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TecnicoEntryForm } from './entry-form'

const TENANT_ID = 'default'

export default async function TecnicoEntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID, is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <main className="p-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/tecnico/estoque" className="text-sm text-slate-400 hover:text-slate-200">
          ← Estoque
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-base font-semibold">Registrar Entrada — {product.name}</h1>
      </div>
      <TecnicoEntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </main>
  )
}
