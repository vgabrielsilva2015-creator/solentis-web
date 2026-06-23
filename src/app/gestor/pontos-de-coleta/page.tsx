import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTenantId } from '@/lib/tenant'
import { MapPin, Check, X } from 'lucide-react'

const MATRIX_LABELS: Record<string, string> = {
  EFLUENTE: 'Efluente',
  SUBTERRANEA: 'Água Subterrânea',
  SUPERFICIAL: 'Água Superficial',
}

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Ponto de Coleta</th>
                <th className="px-4 py-3">Matriz</th>
                <th className="px-4 py-3">Habilitado Para</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pontos.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-100">{p.name}</div>
                        {p.location && <div className="text-xs text-slate-500">Local: {p.location}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {p.matrix ? (MATRIX_LABELS[p.matrix] || p.matrix) : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.is_field ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Campo</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-800 text-slate-600">Campo</Badge>
                      )}
                      {p.is_internal ? (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Interno</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-800 text-slate-600">Interno</Badge>
                      )}
                      {p.is_external ? (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Externo</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-800 text-slate-600">Externo</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/pontos-de-coleta/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-right text-xs text-slate-600">{pontos.length} ponto(s) de coleta encontrado(s)</p>
    </main>
  )
}
