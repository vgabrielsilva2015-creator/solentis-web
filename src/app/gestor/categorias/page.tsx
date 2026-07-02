import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { CategoriasTable } from './categorias-table'

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const categorias = await prisma.equipmentCategory.findMany({
    where: { tenant_id: (await getTenantId()), ...(search ? { name: { contains: search } } : {}) },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias de Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie as famílias ou agrupamentos gerais.</p>
        </div>
        <Link href="/gestor/categorias/novo">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">+ Nova categoria</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-sm text-foreground">
          <strong>O que são Categorias?</strong> As categorias servem para agrupar máquinas do mesmo tipo (ex: "Bombas Centrífugas", "Aeradores", "Sopradores"). 
          Você não cadastra a máquina física aqui. O equipamento físico (ex: "Bomba Elevatória 01") é cadastrado no menu <strong>Equipamentos</strong>, onde você indicará a qual categoria ele pertence.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <Button type="submit" variant="outline" className="border-border text-foreground hover:bg-muted">Buscar</Button>
        {search && <Link href="/gestor/categorias"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">Limpar</Button></Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {categorias.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? `Nenhuma categoria encontrada para "${search}".` : 'Nenhuma categoria cadastrada.'}
          </div>
        ) : (
          <CategoriasTable items={categorias} />
        )}
      </div>
      <p className="text-right text-xs text-muted-foreground">{categorias.length} categoria(s) encontrada(s)</p>
    </main>
  )
}
