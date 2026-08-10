import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { TurnosTable } from './turnos-table'

import { SearchInput } from '@/components/ui/search-input'

export default async function TurnosPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const q = searchParams.q

  const turnos = await prisma.shift.findMany({
    where: { 
      tenant_id: (await getTenantId()),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
    },
    orderBy: { start_time: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Turnos</h1>
          <p className="text-sm text-muted-foreground">Configuração de horários e passagem de turno.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
          <SearchInput placeholder="Buscar por nome..." />
          <div className="flex gap-2">
            <Link href="/gestor/turnos/escala" className="flex-1 sm:flex-none">
              <Button className="w-full border border-border bg-muted text-foreground hover:bg-secondary">
                Gerenciar Escalas
              </Button>
            </Link>
            <Link href="/gestor/turnos/novo" className="flex-1 sm:flex-none">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                + Novo turno
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {turnos.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhum turno cadastrado.</div>
        ) : (
          <TurnosTable items={turnos} />
        )}
      </div>
    </main>
  )
}
