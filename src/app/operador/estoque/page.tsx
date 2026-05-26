import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import { SignOutButton } from '@/components/sign-out-button'

const TENANT_ID = 'default'

export default async function OperadorEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador/dashboard" className="text-sm text-slate-400 hover:text-slate-200">← Dashboard</Link>
          <h1 className="text-base font-semibold">Estoque Químico</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-3">
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)
            const ultimaContagem = p.counts[0]?.counted_at

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>
                        Calculado:{' '}
                        <span className={calculado < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {formatarQuantidade(calculado)} {p.unit}
                        </span>
                      </span>
                      <span>
                        Físico:{' '}
                        <span className={fisico !== null && fisico < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                        </span>
                      </span>
                    </div>
                    {ultimaContagem && (
                      <p className="text-xs text-slate-600 mt-0.5">
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
    </div>
  )
}
