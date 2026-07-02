import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { PontosTable } from './pontos-table'

export default async function PontosColetaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const pontos = await prisma.collectionPoint.findMany({
    where: {
      tenant_id: (await getTenantId()),
      ...(search ? { name: { contains: search } } : {})
    },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pontos de Coleta / Análise</h1>
          <p className="text-sm text-muted-foreground">Cadastre e configure onde as amostras de efluentes ou águas são coletadas.</p>
        </div>
        <Link href="/gestor/pontos-de-coleta/novo">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">+ Novo ponto</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-sm text-foreground">
          <strong>Configuração de Fluxos:</strong> Você pode habilitar cada ponto de coleta para um ou mais fluxos específicos. Pontos habilitados apenas para <em>Laudos Externos</em> não aparecerão na rotina de <em>Leituras de Campo</em> dos operadores, mantendo a interface mobile limpa e objetiva.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <Button type="submit" variant="outline" className="border-border text-foreground hover:bg-muted">Buscar</Button>
        {search && <Link href="/gestor/pontos-de-coleta"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">Limpar</Button></Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {pontos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? `Nenhum ponto de coleta encontrado para "${search}".` : 'Nenhum ponto de coleta cadastrado.'}
          </div>
        ) : (
          <PontosTable items={pontos} />
        )}
      </div>
      <p className="text-right text-xs text-muted-foreground">{pontos.length} ponto(s) de coleta encontrado(s)</p>
    </main>
  )
}
