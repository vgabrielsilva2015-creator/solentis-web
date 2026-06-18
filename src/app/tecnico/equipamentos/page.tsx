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

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; inactive?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

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
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Equipamentos</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/tecnico/equipamentos/novo">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Novo
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-2 items-end">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar equipamento…"
            className="flex-1 min-w-40 rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              name="inactive"
              value="1"
              defaultChecked={showAll}
              className="accent-slate-400"
            />
            Ver inativos
          </label>
          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Buscar
          </button>
        </form>

        {/* Lista */}
        {equipamentos.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhum equipamento encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {equipamentos.map((eq) => {
              const nextPreventive = eq.preventive_maintenances[0] ?? null
              const isOverdue = nextPreventive
                ? new Date(nextPreventive.scheduled_date) < today
                : false

              return (
                <Link
                  key={eq.id}
                  href={`/tecnico/equipamentos/${eq.id}`}
                  className={[
                    'block rounded-xl border bg-slate-900 p-4 hover:bg-slate-800 transition-colors',
                    isOverdue ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{eq.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {eq.category.name}
                        {eq.location ? ` · ${eq.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!eq.is_active && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                          Inativo
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                          Preventiva vencida
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    Próxima preventiva:{' '}
                    <span className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      {nextPreventive ? formatDate(new Date(nextPreventive.scheduled_date)) : 'Nenhuma agendada'}
                    </span>
                  </p>
                </Link>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/tecnico/equipamentos?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/equipamentos?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}
