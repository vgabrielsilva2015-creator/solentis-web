import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'


export default async function TecnicoDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenantId = await getTenantId()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [overdueCount, pendingAnalysesCount, openCorrectivesCount, nonConformCount, schedules, doneInternal, doneExternal] =
    await Promise.all([
      // Preventivas vencidas
      prisma.preventiveMaintenance.count({
        where: {
          tenant_id:      tenantId,
          status:         'SCHEDULED',
          scheduled_date: { lt: today },
          equipment:      { is_active: true },
        },
      }),
      // Análises pendentes de aprovação (qualquer)
      prisma.analysis.count({
        where: { tenant_id: tenantId, approved_by: null },
      }),
      // Corretivas em andamento
      prisma.correctiveMaintenance.count({
        where: { tenant_id: tenantId, status: 'IN_PROGRESS' },
      }),
      // Não-conformidades em aberto (n.c. ainda sem aprovação)
      prisma.analysis.count({
        where: { tenant_id: tenantId, is_non_conformant: true, approved_by: null },
      }),

      // Agendamentos para o Técnico (Checklist do dia)
      prisma.monitoringSchedule.findMany({
        where: {
          tenant_id: tenantId,
          executor_role: 'TECHNICIAN',
          is_active: true,
        },
        include: {
          collection_point: { select: { name: true } },
          parameter: { select: { name: true } },
        }
      }),

      // Análises Internas já feitas hoje
      prisma.analysis.findMany({
        where: {
          tenant_id: tenantId,
          collected_at: { gte: today },
        },
        select: { collection_point_id: true, parameter_id: true }
      }),

      // Laudos Externos já feitos hoje
      prisma.externalAnalysis.findMany({
        where: {
          tenant_id: tenantId,
          collected_at: { gte: today },
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
    if (s.sample_type === 'INTERNAL') {
      return !doneInternal.some(
        r => r.collection_point_id === s.collection_point_id && r.parameter_id === s.parameter_id
      )
    } else if (s.sample_type === 'EXTERNAL') {
      return !doneExternal.some(
        r => r.collection_point_id === s.collection_point_id && r.parameter_id === s.parameter_id
      )
    }
    return true
  })

  const SHORTCUTS = [
    { title: 'Análises',     desc: 'Registrar ou aprovar análises',          href: '/tecnico/analises'          },
    { title: 'Equipamentos', desc: 'Gerenciar preventivas e corretivas',     href: '/tecnico/equipamentos'      },
    { title: 'Ocorrências',  desc: 'Acompanhar e fechar ocorrências',        href: '/tecnico/ocorrencias'       },
    { title: 'Estoque',      desc: 'Registrar entradas de produtos químicos', href: '/tecnico/estoque'          },
    { title: 'Turnos',       desc: 'Tarefas de turno ativas',             href: '/tecnico/turnos/tarefas' },
    { title: 'Escalas',      desc: 'Ver a escala de turnos do mês',       href: '/tecnico/turnos/escala' },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Técnico</p>
        </div>

        {/* Widgets de atenção — 2×2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              overdueCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', overdueCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {overdueCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Preventiva(s) vencida(s)</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              nonConformCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', nonConformCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {nonConformCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Não-conform. em aberto</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              pendingAnalysesCount > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', pendingAnalysesCount > 0 ? 'text-amber-400' : 'text-slate-200'].join(' ')}>
              {pendingAnalysesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Análise(s) p/ aprovar</p>
          </Link>

          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openCorrectivesCount > 0 ? 'border-orange-900/60 bg-orange-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openCorrectivesCount > 0 ? 'text-orange-400' : 'text-slate-200'].join(' ')}>
              {openCorrectivesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Corretiva(s) em andamento</p>
          </Link>
        </div>

        {/* Checklist de Análises do Dia */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-slate-400">Checklist do Laboratório (Hoje)</h2>
          {todaySchedules.length === 0 ? (
             <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
               <p className="text-sm text-slate-500">Nenhuma análise agendada para hoje.</p>
             </div>
          ) : pendingChecklist.length === 0 ? (
             <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-4 flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-green-400">Tudo concluído!</p>
                 <p className="text-xs text-green-500/70 mt-0.5">Você finalizou as {todaySchedules.length} análises de hoje.</p>
               </div>
               <span className="text-green-500 text-2xl">✓</span>
             </div>
          ) : (
             <div className="grid gap-2">
               {pendingChecklist.map(s => (
                 <Link
                   key={s.id}
                   href={`/tecnico/analises/nova?point=${s.collection_point_id}&param=${s.parameter_id}&type=${s.sample_type}`}
                   className="flex items-center justify-between rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 hover:bg-indigo-900/30 transition-colors"
                 >
                   <div>
                     <p className="text-sm font-medium text-indigo-100">{s.parameter.name}</p>
                     <p className="text-xs text-indigo-400/80 mt-0.5">
                       {s.collection_point.name} · {s.sample_type === 'INTERNAL' ? 'Análise Interna' : 'Laudo Externo'}
                     </p>
                   </div>
                   <div className="flex shrink-0 items-center gap-2">
                     <span className="text-xs font-medium text-indigo-400">Registrar</span>
                     <span className="text-indigo-500">→</span>
                   </div>
                 </Link>
               ))}
               
               {todaySchedules.length - pendingChecklist.length > 0 && (
                 <div className="text-center pt-2">
                   <p className="text-xs text-slate-500">{todaySchedules.length - pendingChecklist.length} de {todaySchedules.length} análises concluídas.</p>
                 </div>
               )}
             </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

