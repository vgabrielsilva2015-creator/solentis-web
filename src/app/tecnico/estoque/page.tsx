import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'

const TENANT_ID = 'default'

export default async function TecnicoEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Estoque de Produtos Químicos</h1>
        <p className="text-sm text-slate-400">
          Registre entradas de compra ou recebimento. Para saídas e contagens, use o Operador.
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum produto ativo cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const calculado = calcularEstoqueAtual(
                p.entries.reduce((s, e) => s + e.quantity, 0),
                p.exits.reduce((s, e) => s + e.quantity, 0),
              )
              const fisico  = p.counts[0]?.counted_quantity ?? null
              const alerta  = estaAbaixoMinimo(calculado, fisico, p.min_stock)

              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${
                    alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Calculado: {formatarQuantidade(calculado)} {p.unit}
                      {fisico !== null && ` · Físico: ${formatarQuantidade(fisico)} ${p.unit}`}
                      {` · Mínimo: ${formatarQuantidade(p.min_stock)} ${p.unit}`}
                    </p>
                  </div>
                  <Link
                    href={`/tecnico/estoque/${p.id}/entrada`}
                    className="shrink-0 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                  >
                    + Entrada
                  </Link>
                </div>
              )
            })}
          </div>
        )}
    </main>
  )
}
