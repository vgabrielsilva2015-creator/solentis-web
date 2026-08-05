import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import { getTenantId } from '@/lib/tenant'


import { getProductsWithStock } from '@/lib/stock-queries'

export default async function OperadorEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await getProductsWithStock(await getTenantId())

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Estoque Químico</h1>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => {
            const calculado     = p.current_stock
            const fisico        = p.last_count?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)
            const ultimaContagem = p.last_count?.counted_at

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  alerta ? 'border-red-800/60 bg-card' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>
                        Calculado:{' '}
                        <span className={calculado < p.min_stock ? 'text-red-400 font-medium' : 'text-foreground'}>
                          {formatarQuantidade(calculado)} {p.unit}
                        </span>
                      </span>
                      <span>
                        Físico:{' '}
                        <span className={fisico !== null && fisico < p.min_stock ? 'text-red-400 font-medium' : 'text-foreground'}>
                          {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                        </span>
                      </span>
                    </div>
                    {ultimaContagem && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Última contagem: {ultimaContagem.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/operador/estoque/${p.id}/saida`}
                    className="flex-1 text-center rounded-lg bg-red-900/40 border border-red-800/60 py-2 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    Registrar saída
                  </Link>
                  <Link
                    href={`/operador/estoque/${p.id}/contagem`}
                    className="flex-1 text-center rounded-lg bg-blue-900/30 border border-blue-800/50 py-2 text-sm font-medium text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Contagem física
                  </Link>
                </div>
              </div>
            )
          })
        )}
    </main>
  )
}
