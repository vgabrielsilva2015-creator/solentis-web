import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { encontrarTurnoAtual } from '@/lib/shift-utils'
import { AbrirTurnoRapido } from './abrir-turno-rapido'


export default async function OperadorDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const userId = await resolveUserId(session.user.email!)
  const tenantId = await getTenantId()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openOcorrencias, pendingHandovers, lowStockCount, leiturasDoDia, turnoAtivo, pendingTasksCount, schedules, doneReadings, activeShifts, activeInstances, lastClosedInstance] =
    await Promise.all([
      userId
        ? prisma.occurrence.count({
            where: {
              tenant_id:   tenantId,
              reported_by: userId,
              status:      { in: ['OPEN', 'IN_PROGRESS'] },
            },
          })
        : Promise.resolve(0),

      userId
        ? prisma.shiftHandover.count({
            where: {
              tenant_id:        tenantId,
              status:           'PENDING',
              outgoing_user_id: { not: userId },
              shift_instance:   { date: today, status: 'HANDOVER_PENDING' },
            },
          })
        : Promise.resolve(0),

      // Produtos com estoque calculado abaixo do mínimo
      (async () => {
        const products = await prisma.chemicalProduct.findMany({
          where:  { tenant_id: tenantId, is_active: true },
          select: { min_stock: true, entries: { select: { quantity: true } }, exits: { select: { quantity: true } } },
        })
        return products.filter((p) => {
          const calc = p.entries.reduce((s, e) => s + e.quantity, 0)
                     - p.exits.reduce((s, e) => s + e.quantity, 0)
          return calc < p.min_stock
        }).length
      })(),

      // Leituras registradas hoje por este operador
      userId
        ? prisma.reading.count({
            where: {
              tenant_id:   tenantId,
              recorded_by: userId,
              recorded_at: { gte: today },
            },
          })
        : Promise.resolve(0),

      // Turno ativo aberto por este operador
      userId
        ? prisma.shiftInstance.findFirst({
            where:   { tenant_id: tenantId, opened_by: userId, status: 'OPEN' },
            include: { shift: { select: { name: true, start_time: true, end_time: true } } },
            orderBy: { opened_at: 'desc' },
          })
        : Promise.resolve(null),

      // Tarefas pendentes no turno ativo deste operador
      userId
        ? prisma.shiftTask.count({
            where: {
              tenant_id:      tenantId,
              status:         'PENDING',
              shift_instance: { opened_by: userId, status: 'OPEN' },
              OR: [{ assigned_to_id: userId }, { assigned_to_id: null }],
            },
          })
        : Promise.resolve(0),

      // Agendamentos (Checklist do dia)
      prisma.monitoringSchedule.findMany({
        where: {
          tenant_id: tenantId,
          executor_role: 'OPERATOR',
          is_active: true,
        },
        include: {
          collection_point: { select: { name: true } },
          parameter: { select: { name: true } },
        }
      }),

      // Leituras feitas hoje (para checar o que já foi feito do checklist)
      prisma.reading.findMany({
        where: {
          tenant_id: tenantId,
          recorded_at: { gte: today },
        },
        select: { collection_point_id: true, parameter_id: true }
      }),

      // Turnos configurados ativos — para detectar o turno da faixa horária atual
      prisma.shift.findMany({
        where:  { tenant_id: tenantId, is_active: true },
        select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true },
      }),

      // Instâncias ativas (qualquer operador) — para saber se o turno da vez já está aberto
      prisma.shiftInstance.findMany({
        where:  { tenant_id: tenantId, status: { in: ['OPEN', 'HANDOVER_PENDING'] } },
        select: { shift_id: true },
      }),

      // Último turno encerrado — resumo para o operador entrante
      prisma.shiftInstance.findFirst({
        where:   { tenant_id: tenantId, status: 'CLOSED' },
        orderBy: { closed_at: 'desc' },
        include: {
          shift:    { select: { name: true } },
          opener:   { select: { name: true } },
          handover: {
            select: {
              checklist_data:        true,
              outgoing_observations: true,
              outgoing_user:         { select: { name: true } },
            },
          },
        },
      })
    ])

  // Filtrar checklist do dia
  const dayOfWeek = today.getDay()
  const todaySchedules = schedules.filter(s => 
    s.days_of_week.length === 0 || s.days_of_week.includes(dayOfWeek)
  )

  const pendingChecklist = todaySchedules.filter(s => {
    return !doneReadings.some(
      r => r.collection_point_id === s.collection_point_id && r.parameter_id === s.parameter_id
    )
  })

  // Abertura assistida: turno da faixa horária atual + se já está aberto por alguém
  const now = new Date()
  const currentShift = encontrarTurnoAtual(activeShifts, now)
  const currentShiftOpen = currentShift
    ? activeInstances.some((i) => i.shift_id === currentShift.id)
    : false
  const podeAbrirTurno = session.user.role === 'OPERATOR'

  // Resumo do turno anterior (último encerrado) para o operador entrante
  let resumoAnterior:
    | { shiftName: string; who: string; readings: number; occurrences: number; pendingTasks: string[]; observations: string | null }
    | null = null
  if (lastClosedInstance) {
    const cl = JSON.parse((lastClosedInstance.handover?.checklist_data as string) || '{}') as {
      readings_count?: number
      open_occurrences_count?: number
      pending_tasks?: string[]
    }
    resumoAnterior = {
      shiftName:    lastClosedInstance.shift.name,
      who:          lastClosedInstance.handover?.outgoing_user?.name ?? lastClosedInstance.opener.name,
      readings:     cl.readings_count ?? 0,
      occurrences:  cl.open_occurrences_count ?? 0,
      pendingTasks: cl.pending_tasks ?? [],
      observations: lastClosedInstance.handover?.outgoing_observations ?? null,
    }
  }

  const SHORTCUTS = [
    { title: 'Leituras',       desc: 'Registrar leitura de campo',            href: '/operador/leituras'    },
    { title: 'Ocorrências',    desc: 'Registrar ou acompanhar ocorrências',   href: '/operador/ocorrencias' },
    { title: 'Turnos',         desc: 'Abrir, acompanhar e passar turno',      href: '/operador/turnos'      },
    { title: 'Estoque Químico', desc: 'Registrar saídas e contagens físicas', href: '/operador/estoque'     },
  ]

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Painel do Operador</p>
        </div>

        {/* Passagens urgentes */}
        {pendingHandovers > 0 && (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors"
          >
            <p className="flex items-center gap-2 text-2xl font-bold text-amber-400">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              {pendingHandovers}
            </p>
            <p className="text-xs text-amber-500 mt-1">
              {pendingHandovers === 1 ? 'Passagem de turno aguardando sua confirmação' : 'Passagens de turno aguardando sua confirmação'}
            </p>
          </Link>
        )}

        {/* Estoque baixo */}
        {lowStockCount > 0 && (
          <Link
            href="/operador/estoque"
            className="block rounded-xl border border-red-900/60 bg-red-950/20 p-4 hover:bg-red-950/30 transition-colors"
          >
            <p className="text-2xl font-bold text-red-400">{lowStockCount}</p>
            <p className="text-xs text-red-400/80 mt-1">
              {lowStockCount === 1 ? 'Produto com estoque abaixo do mínimo' : 'Produtos com estoque abaixo do mínimo'}
            </p>
          </Link>
        )}

        {/* Turno ativo */}
        {turnoAtivo ? (
          <Link
            href={`/operador/turnos/${turnoAtivo.id}`}
            className="block rounded-xl border border-green-800/60 bg-green-950/20 p-4 hover:bg-green-950/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">Turno ativo</p>
                <p className="text-lg font-bold text-green-400 mt-0.5">{turnoAtivo.shift.name}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {turnoAtivo.shift.start_time} – {turnoAtivo.shift.end_time} · Em andamento
                </p>
              </div>
              <span className="text-green-500 text-xl">→</span>
            </div>
          </Link>
        ) : currentShift && !currentShiftOpen && podeAbrirTurno ? (
          <AbrirTurnoRapido
            shiftId={currentShift.id}
            shiftName={currentShift.name}
            janela={`${currentShift.start_time} – ${currentShift.end_time}`}
          />
        ) : currentShift && currentShiftOpen ? (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm text-muted-foreground">Turno {currentShift.name} já está aberto</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toque para acompanhar ou assumir a passagem →</p>
          </Link>
        ) : (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
          >
            <p className="text-sm text-muted-foreground">Nenhum turno ativo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toque para abrir um turno →</p>
          </Link>
        )}

        {/* Resumo do turno anterior — para o operador entrante */}
        {!turnoAtivo && resumoAnterior && (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">Resumo do turno anterior</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {resumoAnterior.shiftName} · {resumoAnterior.who}
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{resumoAnterior.readings} leitura(s)</span>
              <span>{resumoAnterior.occurrences} ocorrência(s) em aberto</span>
            </div>
            {resumoAnterior.pendingTasks.length > 0 && (
              <div className="text-xs">
                <p className="text-amber-400 font-medium">
                  {resumoAnterior.pendingTasks.length} tarefa(s) não concluída(s):
                </p>
                <ul className="mt-0.5 space-y-0.5">
                  {resumoAnterior.pendingTasks.map((t, i) => (
                    <li key={i} className="text-foreground">• {t}</li>
                  ))}
                </ul>
              </div>
            )}
            {resumoAnterior.observations && (
              <p className="text-xs text-muted-foreground">
                Observações: <span className="text-foreground">{resumoAnterior.observations}</span>
              </p>
            )}
          </div>
        )}

        {/* Tarefas do turno */}
        {turnoAtivo ? (
          pendingTasksCount > 0 ? (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors"
            >
              <p className="text-2xl font-bold text-amber-400">{pendingTasksCount}</p>
              <p className="text-xs text-amber-500 mt-1">
                {pendingTasksCount === 1 ? 'Tarefa pendente no turno atual' : 'Tarefas pendentes no turno atual'}
              </p>
            </Link>
          ) : (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
            >
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída</p>
              <p className="text-xs text-muted-foreground mt-0.5">Toque para ver tarefas do turno →</p>
            </Link>
          )
        ) : (
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <p className="text-sm text-muted-foreground">Tarefas do turno</p>
            <p className="text-xs text-muted-foreground mt-0.5">Abra um turno primeiro</p>
          </div>
        )}

        {/* Checklist de Coletas Diárias */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">Checklist de Coletas (Hoje)</h2>
          {todaySchedules.length === 0 ? (
             <div className="rounded-xl border border-border bg-card/50 p-4">
               <p className="text-sm text-muted-foreground">Nenhuma coleta agendada para hoje.</p>
             </div>
          ) : pendingChecklist.length === 0 ? (
             <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-4 flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-green-400">Tudo concluído!</p>
                 <p className="text-xs text-green-500/70 mt-0.5">Você finalizou todas as {todaySchedules.length} coletas de hoje.</p>
               </div>
               <span className="text-green-500 text-2xl">✓</span>
             </div>
          ) : (
             <div className="grid gap-2">
               {pendingChecklist.map(s => (
                 <Link
                   key={s.id}
                   href={`/operador/leituras/nova?point=${s.collection_point_id}&param=${s.parameter_id}`}
                   className="flex items-center justify-between rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 hover:bg-blue-900/30 transition-colors"
                 >
                   <div>
                     <p className="text-sm font-medium text-blue-100">{s.parameter.name}</p>
                     <p className="text-xs text-blue-400/80 mt-0.5">{s.collection_point.name}</p>
                   </div>
                   <div className="flex shrink-0 items-center gap-2">
                     <span className="text-xs font-medium text-blue-400">Registrar</span>
                     <span className="text-blue-500">→</span>
                   </div>
                 </Link>
               ))}
               
               {todaySchedules.length - pendingChecklist.length > 0 && (
                 <div className="text-center pt-2">
                   <p className="text-xs text-muted-foreground">{todaySchedules.length - pendingChecklist.length} de {todaySchedules.length} coletas realizadas.</p>
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Leituras de hoje + Ocorrências em aberto */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/operador/leituras"
            className="rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
          >
            <p className="text-2xl font-bold text-foreground">{leiturasDoDia}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {leiturasDoDia === 1 ? 'Leitura hoje' : 'Leituras hoje'}
            </p>
          </Link>

          <Link
            href="/operador/ocorrencias"
            className={[
              'rounded-xl border p-4 hover:bg-muted/60 transition-colors',
              openOcorrencias > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-border bg-card',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openOcorrencias > 0 ? 'text-amber-400' : 'text-foreground'].join(' ')}>
              {openOcorrencias}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {openOcorrencias === 1 ? 'Ocorrência em aberto' : 'Ocorrências em aberto'}
            </p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-muted-foreground">Atalhos</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}
