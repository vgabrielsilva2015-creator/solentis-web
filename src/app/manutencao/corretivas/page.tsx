import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'bg-muted text-muted-foreground border-border',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default async function CorretivasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [corretivas, total] = await Promise.all([
    prisma.correctiveMaintenance.findMany({
      where,
      include: {
        equipment: { select: { name: true, location: true } },
        responsible: { select: { name: true } }
      },
      orderBy: [{ start_date: 'desc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.correctiveMaintenance.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Manutenções Corretivas</h1>
          <p className="text-xs text-muted-foreground">{total} ordem(ns) de serviço</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/manutencao/corretivas"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              !showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-border bg-muted text-muted-foreground hover:bg-secondary',
            ].join(' ')}
          >
            Abertas
          </Link>
          <Link
            href="/manutencao/corretivas?status=all"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-border bg-muted text-muted-foreground hover:bg-secondary',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Tabela */}
      {corretivas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center text-sm text-muted-foreground">
          Nenhuma manutenção corretiva encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Descrição da Falha</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Abertura</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {corretivas.map((corr) => {
                return (
                  <tr key={corr.id} className="bg-card/50 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/manutencao/equipamentos/${corr.equipment_id}`} className="text-blue-400 hover:underline font-medium">
                        {corr.equipment.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{corr.equipment.location || 'Sem localização'}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-foreground line-clamp-1">{corr.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Resp: {corr.responsible.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[corr.priority || 'LOW'] ?? ''}`}>
                        {PRIORITY_LABEL[corr.priority || 'LOW'] ?? corr.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDatetime(corr.start_date)}
                    </td>
                    <td className="px-4 py-3">
                      {corr.status === 'COMPLETED' ? (
                        <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                          Concluída
                        </span>
                      ) : corr.status === 'IN_PROGRESS' ? (
                        <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Em Andamento
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Aberta
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          {page > 1 ? (
            <Link
              href={`/manutencao/corretivas?page=${page - 1}${showAll ? '&status=all' : ''}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Anterior
            </Link>
          ) : <span />}
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/manutencao/corretivas?page=${page + 1}${showAll ? '&status=all' : ''}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Próxima →
            </Link>
          ) : <span />}
        </div>
      )}
    </main>
  )
}
