import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { ParametrosTable } from './parametros-table'

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const params = await prisma.qualityParameter.findMany({
    where: {
      tenant_id: (await getTenantId()),
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
    },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parâmetros de Qualidade</h1>
          <p className="text-sm text-slate-400">Limites e referências legais (CONAMA).</p>
        </div>
        <Link href="/gestor/parametros/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo parâmetro
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/parametros">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {params.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum parâmetro encontrado para "${search}".` : 'Nenhum parâmetro cadastrado.'}
          </div>
        ) : (
          <ParametrosTable items={params} />
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{params.length} parâmetro(s) encontrado(s)</p>
    </main>
  )
}
