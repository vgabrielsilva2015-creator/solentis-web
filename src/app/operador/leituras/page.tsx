import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'
import { ClipboardList, Clock, CheckCircle2, CircleDot, Plus, History } from 'lucide-react'

function formatTime(d: Date): string {
  return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function LeituraChecklistPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenantId = await getTenantId()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()

  // Buscar cronogramas ativos para OPERADOR e leituras já feitas hoje
  const [schedules, doneReadings] = await Promise.all([
    prisma.monitoringSchedule.findMany({
      where: {
        tenant_id: tenantId,
        executor_role: 'OPERATOR',
        is_active: true,
      },
      include: {
        collection_point: { select: { id: true, name: true } },
        parameter: { select: { id: true, name: true, unit: true, min_limit: true, max_limit: true } },
      },
      orderBy: [
        { collection_point: { name: 'asc' } },
        { parameter: { name: 'asc' } },
      ],
    }),

    prisma.reading.findMany({
      where: {
        tenant_id: tenantId,
        recorded_at: { gte: today },
      },
      select: {
        collection_point_id: true,
        parameter_id: true,
        value: true,
        unit: true,
        is_non_conformant: true,
        recorded_at: true,
        notes: true,
      },
      orderBy: { recorded_at: 'desc' },
    }),
  ])

  // Filtrar só os agendamentos que se aplicam hoje (pelo dia da semana)
  const todaySchedules = schedules.filter(
    (s) => s.days_of_week.length === 0 || s.days_of_week.includes(dayOfWeek)
  )

  // Montar checklist: para cada schedule, verifica se já tem leitura feita
  type ChecklistItem = {
    scheduleId: string
    pointId: string
    pointName: string
    paramId: string
    paramName: string
    paramUnit: string
    minLimit: number | null
    maxLimit: number | null
    done: boolean
    reading: {
      value: number | null
      unit: string | null
      isNonConformant: boolean | null
      recordedAt: Date
      notes: string | null
    } | null
  }

  const checklist: ChecklistItem[] = todaySchedules.map((s) => {
    const match = doneReadings.find(
      (r) => r.collection_point_id === s.collection_point_id && r.parameter_id === s.parameter_id
    )
    return {
      scheduleId: s.id,
      pointId: s.collection_point.id,
      pointName: s.collection_point.name,
      paramId: s.parameter.id,
      paramName: s.parameter.name,
      paramUnit: s.parameter.unit,
      minLimit: s.parameter.min_limit,
      maxLimit: s.parameter.max_limit,
      done: !!match,
      reading: match
        ? {
            value: match.value,
            unit: match.unit,
            isNonConformant: match.is_non_conformant,
            recordedAt: match.recorded_at,
            notes: match.notes,
          }
        : null,
    }
  })

  const doneCount = checklist.filter((c) => c.done).length
  const totalCount = checklist.length
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const allDone = totalCount > 0 && doneCount === totalCount

  // Separar pendentes e concluídos
  const pending = checklist.filter((c) => !c.done)
  const completed = checklist.filter((c) => c.done)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">Leituras do Dia</h1>
          <p className="text-xs text-muted-foreground">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <Link
          href="/operador/leituras/historico"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <History className="h-3.5 w-3.5" />
          Histórico
        </Link>
      </div>

      {/* Barra de progresso */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {doneCount} de {totalCount} coleta{totalCount !== 1 ? 's' : ''} realizada{doneCount !== 1 ? 's' : ''}
            </span>
            <span className={`font-semibold ${allDone ? 'text-emerald-400' : 'text-brand'}`}>
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-brand'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tudo concluído */}
      {allDone && (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Tudo concluído!</p>
            <p className="text-xs text-emerald-500/70 mt-0.5">
              Você finalizou todas as {totalCount} coletas de hoje. Bom trabalho!
            </p>
          </div>
        </div>
      )}

      {/* Sem agendamentos */}
      {totalCount === 0 && (
        <div className="rounded-xl border border-border bg-card py-14 text-center space-y-2">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma coleta agendada para hoje.</p>
          <p className="text-xs text-muted-foreground/70">
            O gestor pode configurar coletas em Cronograma.
          </p>
        </div>
      )}

      {/* Lista de pendentes */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pendentes ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((item) => (
              <Link
                key={item.scheduleId}
                href={`/operador/leituras/nova?point=${item.pointId}&param=${item.paramId}`}
                className="flex items-center justify-between rounded-xl border border-blue-900/40 bg-blue-950/15 p-4 hover:bg-blue-900/25 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start gap-3">
                  <CircleDot className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.paramName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.pointName}</p>
                    {(item.minLimit !== null || item.maxLimit !== null) && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                        Limite: {item.minLimit ?? '—'} – {item.maxLimit ?? '—'} {item.paramUnit}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs font-medium text-blue-400">Registrar</span>
                  <span className="text-blue-500">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lista de concluídos */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Concluídas ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((item) => (
              <div
                key={item.scheduleId}
                className={`rounded-xl border p-4 ${
                  item.reading?.isNonConformant
                    ? 'border-red-900/50 bg-red-950/10'
                    : 'border-emerald-900/30 bg-emerald-950/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className={`h-5 w-5 mt-0.5 shrink-0 ${
                        item.reading?.isNonConformant ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.paramName}
                        <span className="ml-2 font-bold font-mono">
                          {item.reading?.value !== null ? item.reading?.value : '—'}
                          {item.reading?.unit ? ` ${item.reading.unit}` : ''}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.pointName}</p>
                      {item.reading && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.reading.recordedAt)}
                          {item.reading.isNonConformant && (
                            <span className="ml-1.5 text-red-400 font-medium">· Fora do limite</span>
                          )}
                          {item.reading.isNonConformant === false && (
                            <span className="ml-1.5 text-emerald-400/70">· Dentro do limite</span>
                          )}
                        </p>
                      )}
                      {item.reading?.notes && (
                        <p className="text-xs text-muted-foreground/50 mt-1 line-clamp-1">{item.reading.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leitura Avulsa */}
      <div className="pt-2 border-t border-border">
        <Link
          href="/operador/leituras/nova"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Leitura Avulsa (fora do cronograma)
        </Link>
      </div>

      {/* Link de volta ao dashboard */}
      <div className="pt-1">
        <Link href="/operador/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Voltar ao painel
        </Link>
      </div>
    </main>
  )
}
