import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { PreAgendarForm } from './pre-agendar-form'
import { getTenantId } from '@/lib/tenant'


export default async function PreAgendarPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { start_time: 'asc' },
  })

  return (
    <div className="max-w-lg space-y-4">
      <BackButton href="/gestor/turnos/tarefas" label="Tarefas" />
      <h1 className="text-xl font-semibold">Pré-agendar Turno</h1>
      <p className="text-sm text-slate-400">
        Crie uma instância de turno com data futura para atribuir tarefas antecipadamente.
      </p>
      <PreAgendarForm shifts={shifts} />
    </div>
  )
}

