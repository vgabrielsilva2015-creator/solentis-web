'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Wrench,
  CheckSquare,
  AlertTriangle,
  FileCheck,
  Calendar,
  X,
  User,
  UserCheck
} from 'lucide-react'

// Shift style mapping
const SHIFT_CLASSES: Record<string, { border: string; bg: string; text: string; dot: string; label: string }> = {
  Manha: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Manhã'
  },
  Tarde: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    label: 'Tarde'
  },
  Noite: {
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    dot: 'bg-indigo-500',
    label: 'Noite'
  },
  Folga: {
    border: 'border-slate-800',
    bg: 'bg-slate-900/30',
    text: 'text-slate-500',
    dot: 'bg-slate-700',
    label: 'Folga'
  }
}

interface EscalaClientProps {
  currentYear: number
  currentMonth: number
  operatorId: string
  operatorName: string
  scales: any[]
  maintenanceDays: any[]
  shiftInstances: any[]
  preventives: any[]
  correctives: any[]
  occurrences: any[]
  schedules: any[]
  shifts: any[]
  operators: any[]
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DAYS_OF_WEEK_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatPtDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-')
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function EscalaClient({
  currentYear,
  currentMonth,
  operatorId,
  operatorName,
  scales,
  maintenanceDays,
  shiftInstances,
  preventives,
  correctives,
  occurrences,
  schedules,
  shifts,
  operators
}: EscalaClientProps) {
  const router = useRouter()
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)

  // Navigate to previous month
  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1
    let newYear = currentYear
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    router.push(`/operador/turnos/escala?year=${newYear}&month=${newMonth}`)
  }

  // Navigate to next month
  const handleNextMonth = () => {
    let newMonth = currentMonth + 1
    let newYear = currentYear
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    router.push(`/operador/turnos/escala?year=${newYear}&month=${newMonth}`)
  }

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1)
  const startDayOfWeek = firstDayOfMonth.getDay() // 0 for Sunday
  const totalDays = new Date(currentYear, currentMonth, 0).getDate()
  const prevMonthTotalDays = new Date(currentYear, currentMonth - 1, 0).getDate()

  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; date: Date }[] = []

  // Fill in previous month spilling days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i
    const date = new Date(currentYear, currentMonth - 2, dayNum)
    calendarCells.push({
      dateStr: toLocalDateString(date),
      dayNum,
      isCurrentMonth: false,
      date
    })
  }

  // Fill in current month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(currentYear, currentMonth - 1, d)
    calendarCells.push({
      dateStr: toLocalDateString(date),
      dayNum: d,
      isCurrentMonth: true,
      date
    })
  }

  // Fill in next month spilling days to complete 42 cells (6 weeks)
  const remaining = 42 - calendarCells.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(currentYear, currentMonth, d)
    calendarCells.push({
      dateStr: toLocalDateString(date),
      dayNum: d,
      isCurrentMonth: false,
      date
    })
  }

  // Parse state helper for a date cell
  const getCellData = (dateStr: string) => {
    const isMaintenanceDay = maintenanceDays.some(m => toLocalDateString(new Date(m.date)) === dateStr)
    const maintenanceDayInfo = maintenanceDays.find(m => toLocalDateString(new Date(m.date)) === dateStr)

    // Logged-in operator's scale on this date
    const operatorScale = scales.find(s => s.operator_id === operatorId && toLocalDateString(new Date(s.date)) === dateStr)

    // Shift instances on this date
    const dayInstances = shiftInstances.filter(inst => toLocalDateString(new Date(inst.date)) === dateStr)
    let totalTasks = 0
    let doneTasks = 0
    dayInstances.forEach(inst => {
      totalTasks += inst.shift_tasks.length
      doneTasks += inst.shift_tasks.filter((t: any) => t.status === 'DONE').length
    })

    // Preventive Maintenance scheduled on this date
    const dayPreventives = preventives.filter(p => toLocalDateString(new Date(p.scheduled_date)) === dateStr)

    // Corrective Maintenance active on this date
    const dayCorrectives = correctives.filter(c => {
      const start = toLocalDateString(new Date(c.start_date))
      const end = c.end_date ? toLocalDateString(new Date(c.end_date)) : null
      return start <= dateStr && (!end || end >= dateStr)
    })

    // Occurrences active or resolved on this date
    const dayOccurrences = occurrences.filter(o => {
      const created = toLocalDateString(new Date(o.created_at))
      const resolved = o.resolved_at ? toLocalDateString(new Date(o.resolved_at)) : null
      return created <= dateStr && (!resolved || resolved >= dateStr)
    })

    // Scheduled analyses count
    const dObj = new Date(dateStr + 'T00:00:00')
    const dayOfWeek = dObj.getDay()
    const dayOfMonth = dObj.getDate()
    const daySchedules = schedules.filter(s => {
      if (s.frequency === 'DAILY' || s.frequency === 'PER_SHIFT') return true
      if (s.frequency === 'WEEKLY' && s.days_of_week.includes(dayOfWeek)) return true
      if (s.frequency === 'MONTHLY' && s.days_of_month.includes(dayOfMonth)) return true
      return false
    })

    const hasAlert = dayPreventives.length > 0 || dayCorrectives.length > 0 || dayOccurrences.length > 0

    return {
      isMaintenanceDay,
      maintenanceDayInfo,
      operatorScale,
      totalTasks,
      doneTasks,
      dayPreventives,
      dayCorrectives,
      dayOccurrences,
      daySchedules,
      hasAlert
    }
  }

  // Selected Day Details computed variables
  const selectedCellData = selectedDateStr ? getCellData(selectedDateStr) : null
  const selectedDayScales = selectedDateStr
    ? scales.filter(s => toLocalDateString(new Date(s.date)) === selectedDateStr)
    : []
  const selectedDayInstances = selectedDateStr
    ? shiftInstances.filter(inst => toLocalDateString(new Date(inst.date)) === selectedDateStr)
    : []

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <Link href="/operador/turnos" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar para Turnos
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Escala & Agenda</h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-semibold px-2 min-w-[100px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend Block */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legenda de Turnos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SHIFT_CLASSES).map(([key, style]) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${style.border} ${style.bg}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-red-900/50 bg-red-950/10">
          <Wrench className="w-4 h-4 text-red-400" />
          <span className="text-xs font-medium text-red-400">Dia de Manutenção (Turnos suspensos)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-850 bg-slate-900/80 text-center py-2 text-xs font-bold text-slate-400">
          {DAYS_OF_WEEK_SHORT.map((day, idx) => (
            <div key={idx}>{day}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-850 bg-slate-950/20">
          {calendarCells.map((cell, idx) => {
            const { isMaintenanceDay, operatorScale, totalTasks, doneTasks, hasAlert } = getCellData(cell.dateStr)

            // Shift style selection
            let cellStyle = 'border-slate-850 hover:bg-slate-900/30'
            let dotColor = ''
            let shiftName = ''

            if (isMaintenanceDay) {
              cellStyle = 'border-dashed border-red-900/40 bg-red-950/10 hover:bg-red-950/20'
            } else if (operatorScale) {
              const shiftKey = operatorScale.shift.name
              const style = SHIFT_CLASSES[shiftKey] || SHIFT_CLASSES.Folga
              cellStyle = `${style.border} ${style.bg} hover:brightness-110`
              dotColor = style.dot
              shiftName = style.label
            }

            return (
              <button
                key={idx}
                onClick={() => setSelectedDateStr(cell.dateStr)}
                className={`relative flex flex-col justify-between p-2 min-h-[72px] text-left transition-all focus:outline-none ${cellStyle} ${
                  !cell.isCurrentMonth ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-mono font-bold ${cell.isCurrentMonth ? 'text-slate-200' : 'text-slate-600'}`}>
                    {cell.dayNum}
                  </span>

                  {/* Warn alert dot */}
                  {hasAlert && !isMaintenanceDay && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-red-500/20 animate-pulse" />
                  )}
                  {isMaintenanceDay && (
                    <Wrench className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>

                {/* Content section */}
                <div className="mt-2 w-full space-y-1">
                  {operatorScale && !isMaintenanceDay && (
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                      <span className="text-[10px] font-bold tracking-tight uppercase truncate max-w-[42px] sm:max-w-none text-slate-300">
                        {shiftName}
                      </span>
                    </div>
                  )}

                  {/* Tasks progress badge */}
                  {totalTasks > 0 && (
                    <div className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                      <CheckSquare className="w-2.5 h-2.5" />
                      <span>{doneTasks}/{totalTasks}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Side Details Drawer */}
      {selectedDateStr && selectedCellData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-200">Agenda do Dia</h2>
                  <p className="text-xs text-slate-400 capitalize">{formatPtDate(selectedDateStr)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDateStr(null)} className="h-8 w-8 text-slate-400 hover:text-slate-100">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Maintenance Mode Warning */}
              {selectedCellData.isMaintenanceDay && (
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex gap-3">
                  <Wrench className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-400">Dia de Manutenção Programada</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedCellData.maintenanceDayInfo?.description || 'Os turnos regulares de operação estão suspensos neste dia.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Escala de Operação */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Escala do Dia
                </h3>
                {selectedCellData.isMaintenanceDay ? (
                  <p className="text-xs text-slate-500 italic">Nenhum operador escalado devido à manutenção programada.</p>
                ) : (
                  <div className="space-y-2">
                    {shifts.map((s) => {
                      const scale = selectedDayScales.find((sc) => sc.shift_id === s.id)
                      const isMe = scale?.operator_id === operatorId
                      const style = SHIFT_CLASSES[s.name] || SHIFT_CLASSES.Folga

                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                          <div className="flex items-center gap-3">
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            <div>
                              <p className="text-xs font-bold text-slate-200">{s.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{s.start_time} - {s.end_time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {scale ? (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isMe ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-slate-800 text-slate-300'}`}>
                                {scale.operator.name} {isMe && '(Você)'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Sem operador</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Checklist / Tarefas */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <CheckSquare className="w-4 h-4 text-amber-400" /> Checklist de Tarefas
                </h3>
                {selectedDayInstances.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhuma tarefa registrada para os turnos desta data.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayInstances.map((inst) => (
                      <div key={inst.id} className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-bold text-slate-400">Turno: {inst.shift.name} ({inst.status === 'SCHEDULED' ? 'Planejado' : inst.status === 'OPEN' ? 'Ativo' : 'Concluído'})</span>
                        </div>
                        {inst.shift_tasks.length === 0 ? (
                          <p className="text-[11px] text-slate-500 pl-5 italic">Nenhuma tarefa associada a este turno.</p>
                        ) : (
                          <div className="space-y-2 pl-4 border-l border-slate-800">
                            {inst.shift_tasks.map((task: any) => (
                              <div key={task.id} className="p-3 rounded-lg border border-slate-850 bg-slate-950/20 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-bold text-slate-200">{task.title}</p>
                                    {task.description && <p className="text-[10px] text-slate-400 mt-0.5">{task.description}</p>}
                                  </div>
                                  <Badge className={
                                    task.status === 'DONE' ? 'bg-green-950 text-green-400 hover:bg-green-950 border border-green-900/40 text-[9px]' :
                                    task.status === 'SKIPPED' ? 'bg-red-950 text-red-400 hover:bg-red-950 border border-red-900/40 text-[9px]' :
                                    'bg-amber-950 text-amber-400 hover:bg-amber-950 border border-amber-900/40 text-[9px]'
                                  }>
                                    {task.status === 'DONE' ? 'Concluída' : task.status === 'SKIPPED' ? 'Ignorada' : 'Pendente'}
                                  </Badge>
                                </div>
                                {task.assignee && (
                                  <div className="flex items-center gap-1 pt-1.5 border-t border-slate-850 text-[10px] text-slate-500">
                                    <User className="w-3 h-3" />
                                    <span>Executor: {task.assignee.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Análises Agendadas */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <FileCheck className="w-4 h-4 text-sky-400" /> Análises Agendadas
                </h3>
                {selectedCellData.daySchedules.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum agendamento de análise ativa para este dia da semana.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCellData.daySchedules.map((s) => (
                      <div key={s.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-200">{s.collection_point.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.executor_role === 'OPERATOR' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {s.executor_role === 'OPERATOR' ? 'Operador' : 'Técnico'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {s.parameter.name} ({s.parameter.unit}) · Tipo: {s.sample_type === 'FIELD' ? 'Campo' : s.sample_type === 'INTERNAL' ? 'Interna' : 'Externa'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ocorrências e Corretivas */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Ocorrências & Manutenções
                </h3>

                {/* Occurrences */}
                {selectedCellData.dayOccurrences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-red-400 tracking-wide uppercase">Ocorrências Ativas</p>
                    {selectedCellData.dayOccurrences.map((o) => (
                      <div key={o.id} className="p-3 rounded-lg border border-red-950/50 bg-red-950/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-200">{o.collection_point?.name || 'Geral'}</p>
                          <Badge variant="outline" className={
                            o.severity === 'CRITICAL' ? 'border-red-500/40 text-red-400 bg-red-950/20 text-[9px]' :
                            o.severity === 'HIGH' ? 'border-orange-500/40 text-orange-400 bg-orange-950/20 text-[9px]' :
                            o.severity === 'MEDIUM' ? 'border-yellow-500/40 text-yellow-400 bg-yellow-950/20 text-[9px]' :
                            'border-slate-500/40 text-slate-400 bg-slate-800/20 text-[9px]'
                          }>
                            {o.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-300">{o.description}</p>
                        <p className="text-[10px] text-slate-500">Relatado por: {o.reporter.name}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Correctives */}
                {selectedCellData.dayCorrectives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-orange-400 tracking-wide uppercase">Manutenções Corretivas</p>
                    {selectedCellData.dayCorrectives.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                        <p className="text-xs font-bold text-slate-200">{c.equipment.name}</p>
                        <p className="text-xs text-slate-400">{c.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Status: {c.status}</span>
                          <span>Responsável: {c.responsible.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preventives */}
                {selectedCellData.dayPreventives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase">Manutenções Preventivas</p>
                    {selectedCellData.dayPreventives.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                        <p className="text-xs font-bold text-slate-200">{p.equipment.name}</p>
                        <p className="text-xs text-slate-400">Patrimônio: {p.equipment.serial_number || 'S/N'}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Status: {p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCellData.dayOccurrences.length === 0 &&
                 selectedCellData.dayCorrectives.length === 0 &&
                 selectedCellData.dayPreventives.length === 0 && (
                  <p className="text-xs text-slate-500 italic">Sem ocorrências ou manutenções registradas para este dia.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
