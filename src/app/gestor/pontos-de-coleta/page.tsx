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
          <p className="text-sm text-slate-400">Cadastre e configure onde as amostras de efluentes ou águas são coletadas.</p>
        </div>
        <Link href="/gestor/pontos-de-coleta/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Novo ponto</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-sm text-slate-300">
          <strong>Configuração de Fluxos:</strong> Você pode habilitar cada ponto de coleta para um ou mais fluxos específicos. Pontos habilitados apenas para <em>Laudos Externos</em> não aparecerão na rotina de <em>Leituras de Campo</em> dos operadores, mantendo a interface mobile limpa e objetiva.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Buscar</Button>
        {search && <Link href="/gestor/pontos-de-coleta"><Button variant="ghost" className="text-slate-400 hover:text-slate-200">Limpar</Button></Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {pontos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum ponto de coleta encontrado para "${search}".` : 'Nenhum ponto de coleta cadastrado.'}
          </div>
        ) : (
          <PontosTable items={pontos} />
        )}
      </div>
      <p className="text-right text-xs text-slate-600">{pontos.length} ponto(s) de coleta encontrado(s)</p>
    </main>
  )
}
