import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { getTenantId } from '@/lib/tenant'
import { APP_TIMEZONE } from '@/lib/date-utils'


const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação de passagem',
  SCHEDULED:        'Agendado',
  CLOSED:           'Fechado',
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIMEZONE })
}

function tempoDecorrido(desde: Date, agora: Date): string {
  const min = Math.max(0, Math.floor((agora.getTime() - desde.getTime()) / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `há ${h}h${String(m).padStart(2, '0')}` : `há ${h}h`
}

export default async function TurnoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params
  const tenantId = await getTenantId()

  const instance = await prisma.shiftInstance.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      shift:  { select: { name: true, start_time: true, end_time: true, crosses_midnight: true } },
      opener: { select: { name: true } },
      handover: { select: { status: true } },
      shift_tasks: { select: { status: true } },
    },
  })

  if (!instance) redirect('/operador/turnos')

  // Janela de tempo do turno para contar as leituras do período
  const [sh, sm] = instance.shift.start_time.split(':').map(Number)
  const [eh, em] = instance.shift.end_time.split(':').map(Number)
  const janelaInicio = new Date(instance.date); janelaInicio.setHours(sh, sm, 0, 0)
  const janelaFim = new Date(instance.date); janelaFim.setHours(eh, em, 0, 0)
  if (instance.shift.crosses_midnight) janelaFim.setDate(janelaFim.getDate() + 1)

  const leiturasNoTurno = await prisma.reading.count({
    where: { tenant_id: tenantId, recorded_at: { gte: janelaInicio, lt: janelaFim } },
  })

  const total   = instance.shift_tasks.length
  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length
  const isOpen  = instance.status === 'OPEN'
  const now = new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <BackButton href="/operador/turnos" label="Turnos" />

      {/* Cabeçalho */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <span className={[
            'rounded px-2 py-0.5 text-xs font-medium border',
            isOpen ? 'bg-green-950/60 text-green-400 border-green-900/50' :
            instance.status === 'HANDOVER_PENDING' ? 'bg-amber-950/60 text-amber-400 border-amber-900/50' :
            'bg-slate-800 text-slate-400 border-slate-700',
          ].join(' ')}>
            {STATUS_LABEL[instance.status] ?? instance.status}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {instance.shift.start_time} – {instance.shift.end_time}
        </p>
        <p className="text-xs text-slate-500">
          Aberto por {instance.opener.name} às {formatTime(new Date(instance.opened_at))} · {tempoDecorrido(new Date(instance.opened_at), now)}
        </p>
      </div>

      {/* Tarefas */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Tarefas</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {done} de {total} concluída(s){pending > 0 ? ` · ${pending} pendente(s)` : ''}
            </p>
          </div>
          {pending > 0 && (
            <span className="rounded bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-400">
              {pending} pendente(s)
            </span>
          )}
        </div>
        <Link href={`/operador/turnos/${instance.id}/tarefas`}>
          <Button className="h-11 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
            Ver tarefas
          </Button>
        </Link>
      </div>

      {/* Leituras do turno */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Leituras deste turno</p>
          <p className="text-2xl font-bold text-slate-100 mt-0.5">{leiturasNoTurno}</p>
          <p className="text-xs text-slate-500">registrada(s) na janela {instance.shift.start_time}–{instance.shift.end_time}</p>
        </div>
        <Link href="/operador/leituras">
          <Button className="h-11 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
            Ver leituras
          </Button>
        </Link>
      </div>

      {/* Passagem de turno */}
      {isOpen ? (
        <Link href={`/operador/turnos/${instance.id}/passagem`}>
          <Button className="h-12 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium">
            Iniciar passagem de turno
          </Button>
        </Link>
      ) : instance.status === 'HANDOVER_PENDING' ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-center text-sm text-amber-400">
          Passagem em andamento — aguardando confirmação do operador entrante.
        </p>
      ) : null}
    </main>
  )
}
