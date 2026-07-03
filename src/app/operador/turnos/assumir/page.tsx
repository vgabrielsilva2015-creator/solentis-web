import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AssumirForm } from './assumir-form'
import { getTenantId } from '@/lib/tenant'


function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function AssumirPostoPage({
  searchParams,
}: {
  searchParams: Promise<{ instanceId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { instanceId } = await searchParams
  if (!instanceId) redirect('/operador/turnos')

  const tenantId = await getTenantId()

  const instance = await prisma.shiftInstance.findFirst({
    where: { id: instanceId, tenant_id: tenantId, status: 'OPEN' },
    include: {
      shift:  { select: { name: true, start_time: true, end_time: true } },
      opener: { select: { name: true } },
    },
  })
  if (!instance) redirect('/operador/turnos')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: tenantId, is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <BackButton href="/operador/turnos" label="Turnos" />
      <div>
        <h1 className="text-xl font-semibold">Assumir Posto</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Turno {instance.shift.name} · aberto por {instance.opener.name} às {formatTime(new Date(instance.opened_at))}
        </p>
      </div>

      <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 space-y-2">
        <p className="text-sm text-red-300">
          O operador anterior não encerrou este turno. Ao assumir o posto, o turno anterior será fechado
          automaticamente e um novo será aberto para você.
        </p>
        <p className="text-xs text-red-400/70">
          Tarefas pendentes serão migradas para o seu novo turno.
        </p>
      </div>

      <AssumirForm oldInstanceId={instanceId} shifts={shifts} />
    </main>
  )
}
