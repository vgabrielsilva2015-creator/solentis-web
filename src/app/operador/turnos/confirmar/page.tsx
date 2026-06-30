import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConfirmForm } from './confirm-form'
import { getTenantId } from '@/lib/tenant'


function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ handoverId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { handoverId } = await searchParams
  if (!handoverId) redirect('/operador/turnos')

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: {
      shift_instance: {
        select: {
          id:        true,
          tenant_id: true,
          shift: { select: { name: true, start_time: true, end_time: true } },
        },
      },
      outgoing_user: { select: { name: true } },
    },
  })

  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) redirect('/operador/turnos')
  if (handover.status !== 'PENDING') redirect('/operador/turnos')

  const checklist = (handover.checklist_data as {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  }) ?? {}

  const vencido = new Date(handover.timeout_at) < new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Confirmar recebimento</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {handover.shift_instance.shift.name} · sainte: {handover.outgoing_user.name}
            </p>
          </div>
          {vencido && (
            <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
              TIMEOUT
            </span>
          )}
        </div>

        {/* Resumo do turno sainte */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', (checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Itens pendentes</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          {handover.outgoing_observations && (
            <div className="rounded-lg bg-slate-800/40 px-3 py-2">
              <p className="text-xs font-medium text-slate-400 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300">{handover.outgoing_observations}</p>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Prazo de confirmação: {formatDatetime(new Date(handover.timeout_at))}
          </p>
        </div>

        <ConfirmForm handoverId={handoverId} />

    </main>
  )
}
