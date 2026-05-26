import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  calcularEstoqueAtual,
  calcularDivergencia,
  estaAbaixoMinimo,
  formatarQuantidade,
} from '@/lib/stock-utils'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'

const TENANT_ID = 'default'

type Movement =
  | { tipo: 'entrada';  date: Date; qty: number; supplier: string | null; invoice: string | null; notes: string | null; recorder: string }
  | { tipo: 'saida';    date: Date; qty: number; notes: string | null; recorder: string }
  | { tipo: 'contagem'; date: Date; qty: number; notes: string | null; recorder: string }

export default async function ProdutoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID },
    include: {
      entries: { orderBy: { received_at: 'desc' }, include: { recorder: { select: { name: true } } } },
      exits:   { orderBy: { used_at:     'desc' }, include: { recorder: { select: { name: true } } } },
      counts:  { orderBy: { counted_at:  'desc' }, include: { recorder: { select: { name: true } } } },
    },
  })

  if (!product) notFound()

  const totalEntradas = product.entries.reduce((s, e) => s + e.quantity, 0)
  const totalSaidas   = product.exits.reduce((s, e) => s + e.quantity, 0)
  const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
  const fisico        = product.counts[0]?.counted_quantity ?? null
  const divergencia   = calcularDivergencia(calculado, fisico)
  const alerta        = estaAbaixoMinimo(calculado, fisico, product.min_stock)

  const movements: Movement[] = [
    ...product.entries.map((e) => ({
      tipo: 'entrada' as const,
      date: e.received_at,
      qty: e.quantity,
      supplier: e.supplier,
      invoice: e.invoice_number,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.exits.map((e) => ({
      tipo: 'saida' as const,
      date: e.used_at,
      qty: e.quantity,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.counts.map((c) => ({
      tipo: 'contagem' as const,
      date: c.counted_at,
      qty: c.counted_quantity,
      notes: c.notes,
      recorder: c.recorder.name,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/gestor/produtos-quimicos" className="text-sm text-slate-400 hover:text-slate-200">
            ← Produtos Químicos
          </Link>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-100">{product.name}</h1>
            {!product.is_active && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
            )}
            {alerta && product.is_active && (
              <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                ESTOQUE BAIXO
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/gestor/produtos-quimicos/${id}/entrada`}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Registrar entrada
        </Link>
      </div>

      {/* Resumo de estoque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Estoque calculado',
            value: `${formatarQuantidade(calculado)} ${product.unit}`,
            color: calculado < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Estoque físico',
            value: fisico !== null ? `${formatarQuantidade(fisico)} ${product.unit}` : '—',
            color: fisico !== null && fisico < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Mínimo',
            value: `${formatarQuantidade(product.min_stock)} ${product.unit}`,
            color: 'text-slate-400',
          },
          {
            label: 'Divergência',
            value: divergencia !== null
              ? `${divergencia >= 0 ? '+' : ''}${formatarQuantidade(divergencia)} ${product.unit}`
              : '—',
            color: divergencia === null ? 'text-slate-500'
              : divergencia < 0 ? 'text-amber-400'
              : 'text-green-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Editar produto */}
      <details className="rounded-lg border border-slate-700 bg-slate-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 select-none">
          Editar dados do produto
        </summary>
        <div className="px-4 pb-4">
          <EditForm product={product} />
        </div>
      </details>

      <ToggleButton id={product.id} is_active={product.is_active} />

      {/* Histórico de movimentação */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Histórico de movimentação ({movements.length})
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded ${
                  m.tipo === 'entrada'  ? 'bg-green-900/40 text-green-400' :
                  m.tipo === 'saida'   ? 'bg-red-900/40 text-red-400' :
                                         'bg-blue-900/40 text-blue-400'
                }`}>
                  {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Contagem'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">
                      {m.tipo === 'contagem' ? '=' : m.tipo === 'entrada' ? '+' : '−'}{formatarQuantidade(m.qty)} {product.unit}
                    </span>
                    {m.tipo === 'entrada' && m.supplier && (
                      <span className="text-xs text-slate-400">· {m.supplier}</span>
                    )}
                    {m.tipo === 'entrada' && m.invoice && (
                      <span className="text-xs text-slate-500">NF {m.invoice}</span>
                    )}
                  </div>
                  {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {m.date.toLocaleString('pt-BR')} · {m.recorder}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
