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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <Link href="/tecnico/estoque" className="text-sm text-slate-400 hover:text-slate-200">
          ← Estoque
        </Link>
        <h1 className="text-lg font-semibold mt-1">Registrar Entrada — {product.name}</h1>
      </header>
      <main className="p-6 max-w-lg mx-auto">
        <TecnicoEntryForm productId={product.id} productName={product.name} unit={product.unit} />
      </main>
    </div>
  )
}
