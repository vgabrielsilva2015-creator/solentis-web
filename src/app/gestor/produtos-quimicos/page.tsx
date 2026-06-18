import { prisma } from '@/lib/prisma'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'


export default async function ProdutosQuimicosPage() {
  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: (await getTenantId()) },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Produtos Químicos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Estoque e movimentação de reagentes</p>
        </div>
        <Link
          href="/gestor/produtos-quimicos/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum produto cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)

            return (
              <Link
                key={p.id}
                href={`/gestor/produtos-quimicos/${p.id}`}
                className={`block rounded-lg border p-4 transition-colors hover:border-slate-600 ${
                  !p.is_active
                    ? 'border-slate-800 bg-slate-900/40 opacity-60'
                    : alerta
                    ? 'border-red-800/60 bg-slate-900'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {!p.is_active && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
                      )}
                      {alerta && p.is_active && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.description}</p>
                    )}
                  </div>

                  <div className="flex gap-6 shrink-0 text-right text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Calculado</p>
                      <p className={`font-medium ${alerta && calculado < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {formatarQuantidade(calculado)} {p.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Físico</p>
                      <p className={`font-medium ${fisico !== null && fisico < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Mínimo</p>
                      <p className="font-medium text-slate-400">
                        {formatarQuantidade(p.min_stock)} {p.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
