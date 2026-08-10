import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateDisplay } from '@/lib/date-utils'
import { getTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { Pencil, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Análises Registradas | Solentis',
}

export default async function GestorAnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  const tenant_id = await getTenantId()
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const take = 20
  const skip = (currentPage - 1) * take

  const [analises, total] = await Promise.all([
    prisma.analysis.findMany({
      where: { tenant_id },
      include: {
        parameter: true,
        collection_point: true,
        recorder: { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take,
      skip,
    }),
    prisma.analysis.count({ where: { tenant_id } }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Histórico de Análises" 
          description="Visualize e edite as análises registradas pelos técnicos."
        />
        <Link href={`/api/export?type=analyses`} target="_blank">
          <Button variant="outline" className="border-border bg-muted text-foreground hover:bg-secondary text-xs h-8">
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
        </Link>
      </div>

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Data / Hora</th>
              <th className="px-4 py-3 font-medium">Parâmetro</th>
              <th className="px-4 py-3 font-medium">Ponto de Coleta</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Lab</th>
              <th className="px-4 py-3 font-medium">Registrado por</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {analises.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma análise registrada até o momento.
                </td>
              </tr>
            ) : (
              analises.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateDisplay(a.collected_at)}
                  </td>
                  <td className="px-4 py-3">
                    {a.parameter.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.collection_point?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className={a.is_non_conformant ? 'text-red-400' : 'text-emerald-400'}>
                      {a.value} {a.parameter.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.laboratory_type === 'EXTERNAL' ? 'Externo' : 'Interno'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.recorder?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/gestor/analises/${a.id}/editar`}
                        className="text-muted-foreground hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Mostrando {skip + 1} a {Math.min(skip + take, total)} de {total} análises
          </p>
          <div className="flex gap-2">
            <Link
              href={`/gestor/analises?page=${currentPage - 1}`}
              className={`px-3 py-1.5 text-sm rounded-md border border-border ${
                currentPage <= 1 
                  ? 'pointer-events-none opacity-50 text-muted-foreground' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Anterior
            </Link>
            <Link
              href={`/gestor/analises?page=${currentPage + 1}`}
              className={`px-3 py-1.5 text-sm rounded-md border border-border ${
                currentPage >= totalPages 
                  ? 'pointer-events-none opacity-50 text-muted-foreground' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
