import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ShiftForm } from './shift-form'
import { getTenantId } from '@/lib/tenant'


export default async function AbrirTurnoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div>
        <BackButton href="/operador/turnos" label="Turnos" />
        <h1 className="text-xl font-semibold mt-1">Abrir turno</h1>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Nenhum turno configurado.</p>
          <p className="text-xs text-muted-foreground">Peça ao gestor para cadastrar os turnos.</p>
        </div>
      ) : (
        <ShiftForm shifts={shifts} />
      )}
    </main>
  )
}
