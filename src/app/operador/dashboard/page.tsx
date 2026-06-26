import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId, resolveUserId } from '@/lib/tenant'


export default async function OperadorDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const userId = await resolveUserId(session.user.email!)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openOcorrencias, pendingHandovers, lowStockCount, leiturasDoDia, turnoAtivo, pendingTasksCount, schedules, doneReadings] =
    await Promise.all([
      userId
        ? prisma.occurrence.count({
            where: {
              tenant_id:   (await getTenantId()),
              reported_by: userId,
              status:      { in: ['OPEN', 'IN_PROGRESS'] },
            },
          })
        : Promise.resolve(0),

      userId
        ? prisma.shiftHandover.count({
            where: {
              tenant_id:        (await getTenantId()),
              status:           'PENDING',
              outgoing_user_id: { not: userId },
              shift_instance:   { date: today, status: 'HANDOVER_PENDING' },
            },
          })
        : Promise.resolve(0),

      // Produtos com estoque calculado abaixo do mínimo
      (async () => {
        const products = await prisma.chemicalProduct.findMany({
          where:  { tenant_id: (await getTenantId()), is_active: true },
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
              tenant_id:   (await getTenantId()),
              recorded_by: userId,
              recorded_at: { gte: today },
            },
          })
        : Promise.resolve(0),

      // Turno ativo aberto por este operador
      userId
        ? prisma.shiftInstance.findFirst({
            where:   { tenant_id: (await getTenantId()), opened_by: userId, status: 'OPEN' },
            include: { shift: { select: { name: true, start_time: true, end_time: true } } },
            orderBy: { opened_at: 'desc' },
          })
        : Promise.resolve(null),

      // Tarefas pendentes no turno ativo deste operador
      userId
        ? prisma.shiftTask.count({
            where: {
              tenant_id:      (await getTenantId()),
              status:         'PENDING',
              shift_instance: { opened_by: userId, status: 'OPEN' },
              OR: [{ assigned_to_id: userId }, { assigned_to_id: null }],
            },
          })
        : Promise.resolve(0),

      // Agendamentos (Checklist do dia)
      prisma.monitoringSchedule.findMany({
        where: {
          tenant_id: (await getTenantId()),
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
          tenant_id: (await getTenantId()),
          recorded_at: { gte: today },
        },
        select: { collection_point_id: true, parameter_id: true }
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
          <p className="text-slate-400 text-sm mt-0.5">Painel do Operador</p>
        </div>

        {/* Passagens urgentes */}
        {pendingHandovers > 0 && (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors animate-pulse"
          >
            <p className="text-2xl font-bold text-amber-400">{pendingHandovers}</p>
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
        ) : (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-sm text-slate-500">Nenhum turno ativo</p>
            <p className="text-xs text-slate-600 mt-0.5">Toque para abrir um turno →</p>
          </Link>
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
              className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
            >
              <p className="text-sm text-slate-400">Nenhuma tarefa atribuída</p>
              <p className="text-xs text-slate-600 mt-0.5">Toque para ver tarefas do turno →</p>
            </Link>
          )
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-600">Tarefas do turno</p>
            <p className="text-xs text-slate-700 mt-0.5">Abra um turno primeiro</p>
          </div>
        )}

        {/* Checklist de Coletas Diárias */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-slate-400">Checklist de Coletas (Hoje)</h2>
          {todaySchedules.length === 0 ? (
             <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
               <p className="text-sm text-slate-500">Nenhuma coleta agendada para hoje.</p>
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
                   <p className="text-xs text-slate-500">{todaySchedules.length - pendingChecklist.length} de {todaySchedules.length} coletas realizadas.</p>
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Leituras de hoje + Ocorrências em aberto */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/operador/leituras"
            className="rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-2xl font-bold text-slate-100">{leiturasDoDia}</p>
            <p className="text-xs text-slate-500 mt-1">
              {leiturasDoDia === 1 ? 'Leitura hoje' : 'Leituras hoje'}
            </p>
          </Link>

          <Link
            href="/operador/ocorrencias"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openOcorrencias > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-700 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openOcorrencias > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
              {openOcorrencias}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {openOcorrencias === 1 ? 'Ocorrência em aberto' : 'Ocorrências em aberto'}
            </p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}
