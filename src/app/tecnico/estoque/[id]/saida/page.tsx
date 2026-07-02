import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { ExitForm } from './exit-form'
import { getTenantId } from '@/lib/tenant'


export default async function SaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: (await getTenantId()), is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )

  return (
    <main className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-4">
        <BackButton href="/tecnico/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Saída — {product.name}</h1>
      </div>
      <div className="rounded-lg bg-muted/50 px-4 py-3 mb-5 flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Estoque calculado</p>
            <p className={`font-semibold ${calculado < product.min_stock ? 'text-red-400' : 'text-foreground'}`}>
              {formatarQuantidade(calculado)} {product.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mínimo</p>
            <p className="font-semibold text-muted-foreground">
              {formatarQuantidade(product.min_stock)} {product.unit}
            </p>
          </div>
        </div>
        <ExitForm
          productId={product.id}
          productName={product.name}
          unit={product.unit}
          estoqueAtual={calculado}
        />
    </main>
  )
}
