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
          <p className="text-sm text-muted-foreground">Limites e referências legais (CONAMA).</p>
        </div>
        <Link href="/gestor/parametros/novo">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
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
          className="h-10 flex-1 rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" variant="outline" className="border-border text-foreground hover:bg-muted">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/parametros">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {params.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? `Nenhum parâmetro encontrado para "${search}".` : 'Nenhum parâmetro cadastrado.'}
          </div>
        ) : (
          <ParametrosTable items={params} />
        )}
      </div>

      <p className="text-right text-xs text-muted-foreground">{params.length} parâmetro(s) encontrado(s)</p>
    </main>
  )
}
