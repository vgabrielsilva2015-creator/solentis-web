import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function GestorEquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; inactive?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  const { page: pageParam, q, inactive } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = inactive === '1'
  const search    = q?.trim() ?? ''

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { is_active: true }),
    ...(search ? { name: { contains: search } } : {}),
  }

  const [equipamentos, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        category: { select: { name: true } },
        preventive_maintenances: {
          where:   { status: 'SCHEDULED' },
          orderBy: { scheduled_date: 'asc' },
          take:    1,
          select:  { scheduled_date: true },
        },
      },
      orderBy: { name: 'asc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.equipment.count({ where }),
  ])

  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipamentos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie o parque de equipamentos da unidade ({total} cadastrados).</p>
          </div>
          <Link href="/gestor/equipamentos/novo">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500 w-full sm:w-auto shadow-sm">
              + Novo Equipamento
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome do equipamento..."
            className="flex-1 min-w-[200px] h-10 rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring shadow-sm"
          />
          <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted text-sm text-foreground cursor-pointer select-none hover:bg-secondary transition-colors">
            <input
              type="checkbox"
              name="inactive"
              value="1"
              defaultChecked={showAll}
              className="accent-muted-foreground w-4 h-4"
            />
            Ver inativos
          </label>
          <button
            type="submit"
            className="h-10 rounded-md border border-border bg-muted px-6 text-sm font-medium text-foreground hover:bg-secondary shadow-sm transition-colors"
          >
            Filtrar
          </button>
        </form>

        {/* Lista */}
        {equipamentos.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed bg-card/50 py-16 text-center text-sm text-muted-foreground">
            Nenhum equipamento foi encontrado na base.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nome / Modelo</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Próxima Preventiva</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {equipamentos.map((eq) => {
                    const nextPreventive = eq.preventive_maintenances[0] ?? null
                    const isOverdue = nextPreventive
                      ? new Date(nextPreventive.scheduled_date) < today
                      : false

                    return (
                      <tr key={eq.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{eq.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {eq.serial_number ? `SN: ${eq.serial_number}` : 'S/N'} {eq.location ? `· ${eq.location}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-foreground">
                          {eq.category.name}
                        </td>
                        <td className="px-6 py-4">
                          {eq.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-muted/10 text-muted-foreground border border-border/20">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {nextPreventive ? (
                            <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-foreground'}>
                              {formatDate(new Date(nextPreventive.scheduled_date))}
                              {isOverdue && ' (Atrasada)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Nenhuma agendada</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/gestor/equipamentos/${eq.id}`}
                            className="text-emerald-400 hover:text-emerald-300 font-medium text-xs transition-colors"
                          >
                            Gerenciar
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            {page > 1 ? (
              <Link
                href={`/gestor/equipamentos?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/gestor/equipamentos?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
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
