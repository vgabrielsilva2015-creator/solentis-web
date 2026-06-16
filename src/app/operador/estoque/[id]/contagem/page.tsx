import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { CountForm } from './count-form'

const TENANT_ID = 'default'

export default async function ContagemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: TENANT_ID, is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )
  const ultimaContagem = product.counts[0] ?? null

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div>
        <BackButton href="/operador/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Contagem Física — {product.name}</h1>
      </div>
        <div className="rounded-lg bg-slate-800/50 px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Estoque calculado</span>
            <span className="font-medium text-slate-100">{formatarQuantidade(calculado)} {product.unit}</span>
          </div>
          {ultimaContagem && (
            <div className="flex justify-between">
              <span className="text-slate-400">Última contagem</span>
              <span className="font-medium text-slate-100">
                {formatarQuantidade(ultimaContagem.counted_quantity)} {product.unit}
                <span className="text-slate-500 text-xs ml-2">
                  ({ultimaContagem.counted_at.toLocaleDateString('pt-BR')})
                </span>
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Conte o estoque fisicamente e registre a quantidade real. A divergência em relação ao
          calculado será exibida para o Gestor.
        </p>

        <CountForm
          productId={product.id}
          unit={product.unit}
          estoqueCalculado={calculado}
        />
    </main>
  )
}
