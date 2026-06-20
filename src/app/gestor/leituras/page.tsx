import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function GestorLeiturasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where:   { tenant_id: (await getTenantId()) },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        recorder:         { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where: { tenant_id: (await getTenantId()) } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Todas as Leituras</h1>
            <p className="text-sm text-slate-400">Histórico completo de registros manuais e inteligência artificial. ({total} registros)</p>
          </div>
          <Link href={`/api/export?type=readings`} target="_blank">
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8">
              <Download className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </Link>
        </div>

        {/* Tabela de leituras */}
        {readings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-14 text-center text-sm text-slate-500">
            Nenhuma leitura registrada ainda.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/50 text-xs uppercase font-medium text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Ponto de Coleta</th>
                  <th className="px-4 py-3">Parâmetro</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {readings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDatetime(r.recorded_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-300">{r.collection_point.name}</td>
                    <td className="px-4 py-3">{r.parameter?.name || 'Observação Visual'}</td>
                    <td className="px-4 py-3">
                      {r.value !== null ? (
                        <span className="font-mono text-slate-200">
                          {r.value} {r.unit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.recorder?.name || 'Sistema'}</td>
                    <td className="px-4 py-3 text-right">
                      {r.is_non_conformant === true ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          FORA DO LIMITE
                        </span>
                      ) : r.is_non_conformant === false ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          CONFORME
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/gestor/leituras?page=${page - 1}`}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-500 font-medium">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/gestor/leituras?page=${page + 1}`}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
    </main>
  )
}
