import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const TENANT_ID = 'default'

const FEATURES = [
  { title: 'Usuários',      href: '/gestor/usuarios',         desc: 'Cadastro e gerenciamento de contas',       active: true  },
  { title: 'Parâmetros',    href: '/gestor/parametros',       desc: 'Limites de qualidade e histórico CONAMA',  active: true  },
  { title: 'Configurações', href: '/gestor/metodos',          desc: 'Métodos, categorias, pontos e turnos',     active: true  },
  { title: 'Produtos Químicos', href: '/gestor/produtos-quimicos', desc: 'Estoque, entradas e movimentação',    active: true  },
  { title: 'Leituras',      href: '#',                        desc: 'Registros de campo por turno',             active: false },
  { title: 'Análises',      href: '#',                        desc: 'Análises laboratoriais',                   active: false },
  { title: 'Equipamentos',  href: '#',                        desc: 'Cadastro e manutenção preventiva',         active: false },
  { title: 'Ocorrências',   href: '#',                        desc: 'Gestão de incidentes e resoluções',        active: false },
  { title: 'Turnos',        href: '#',                        desc: 'Histórico e passagens de turno',           active: false },
]

export default async function GestorDashboard() {
  const products = await prisma.chemicalProduct.findMany({
    where:  { tenant_id: TENANT_ID, is_active: true },
    select: {
      min_stock: true,
      entries:   { select: { quantity: true } },
      exits:     { select: { quantity: true } },
      counts:    { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  const lowStockProducts = products.filter((p) => {
    const calculado = p.entries.reduce((s, e) => s + e.quantity, 0)
                    - p.exits.reduce((s, e) => s + e.quantity, 0)
    const fisico    = p.counts[0]?.counted_quantity ?? null
    return calculado < p.min_stock || (fisico !== null && fisico < p.min_stock)
  })

  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">Acesso rápido às funcionalidades do sistema.</p>
      </div>

      {/* Widget de estoque baixo */}
      {lowStockProducts.length > 0 && (
        <Link
          href="/gestor/produtos-quimicos"
          className="flex items-center gap-4 rounded-xl border border-red-800/60 bg-red-950/20 px-5 py-4 hover:bg-red-950/30 transition-colors"
        >
          <p className="text-3xl font-bold text-red-400">{lowStockProducts.length}</p>
          <div>
            <p className="text-sm font-medium text-red-300">
              {lowStockProducts.length === 1
                ? 'Produto com estoque abaixo do mínimo'
                : 'Produtos com estoque abaixo do mínimo'}
            </p>
            <p className="text-xs text-red-500 mt-0.5">Ver produtos químicos →</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`space-y-2 rounded-xl border bg-slate-900 p-5 ${
              f.active ? 'border-slate-700' : 'border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-200">{f.title}</h2>
              {!f.active && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                  Em breve
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{f.desc}</p>
            {f.active && f.href !== '#' && (
              <Link
                href={f.href}
                className="mt-1 block text-xs text-emerald-400 hover:text-emerald-300"
              >
                Acessar →
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
