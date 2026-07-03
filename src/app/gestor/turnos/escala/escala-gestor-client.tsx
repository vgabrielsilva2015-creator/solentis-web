'use client'

import { useState, useTransition } from 'react'
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
  Plus,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  Check,
  UserCheck
} from 'lucide-react'
import { saveShiftScale, toggleMaintenanceDay, addShiftTask, deleteShiftTask } from './actions'

// Shift color/style maps
const SHIFT_CLASSES: Record<string, { border: string; bg: string; text: string; dot: string; label: string; abbreviation: string }> = {
  Manha: {
    border: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Manhã',
    abbreviation: 'M'
  },
  Tarde: {
    border: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    label: 'Tarde',
    abbreviation: 'T'
  },
  Noite: {
    border: 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    dot: 'bg-indigo-500',
    label: 'Noite',
    abbreviation: 'N'
  }
}

interface EscalaGestorClientProps {
  currentYear: number
  currentMonth: number
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

export function EscalaGestorClient({
  currentYear,
  currentMonth,
  scales,
  maintenanceDays,
  shiftInstances,
  preventives,
  correctives,
  occurrences,
  schedules,
  shifts,
  operators
}: EscalaGestorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)
  
  // Inline task form states
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({})
  const [newTaskDescs, setNewTaskDescs] = useState<Record<string, string>>({})
  const [newTaskAssignees, setNewTaskAssignees] = useState<Record<string, string>>({})

  // Maintenance Day block description
  const [maintenanceDesc, setMaintenanceDesc] = useState('')

  // Navigate to previous month
  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1
    let newYear = currentYear
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    router.push(`/gestor/turnos/escala?year=${newYear}&month=${newMonth}`)
  }

  // Navigate to next month
  const handleNextMonth = () => {
    let newMonth = currentMonth + 1
    let newYear = currentYear
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    router.push(`/gestor/turnos/escala?year=${newYear}&month=${newMonth}`)
  }

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1)
  const startDayOfWeek = firstDayOfMonth.getDay()
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

  // Fill in next month spilling days to complete 42 cells
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

    // All scales on this date
    const dayScales = scales.filter(s => toLocalDateString(new Date(s.date)) === dateStr)

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
      dayScales,
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

  // Assign or remove operator scale handler
  const handleAssignOperator = (shiftId: string, opId: string) => {
    if (!selectedDateStr) return
    startTransition(async () => {
      try {
        const existingAssignment = selectedDayScales.find(s => s.shift_id === shiftId)
        if (opId === 'none') {
          // If we had an assignment, remove it
          if (existingAssignment) {
            await saveShiftScale(existingAssignment.operator_id, shiftId, selectedDateStr, 'remove')
          }
        } else {
          // If we are swapping/replacing: remove the old one first if it exists
          if (existingAssignment && existingAssignment.operator_id !== opId) {
            await saveShiftScale(existingAssignment.operator_id, shiftId, selectedDateStr, 'remove')
          }
          await saveShiftScale(opId, shiftId, selectedDateStr, 'assign')
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao salvar escala.')
      }
    })
  }

  // Toggle maintenance day block
  const handleToggleMaintenance = () => {
    if (!selectedDateStr) return
    startTransition(async () => {
      try {
        await toggleMaintenanceDay(selectedDateStr, maintenanceDesc)
        setMaintenanceDesc('')
      } catch (err: any) {
        alert(err.message || 'Erro ao alterar dia de manutenção.')
      }
    })
  }

  // Add task to shift scale day handler
  const handleAddTask = (shiftId: string) => {
    if (!selectedDateStr) return
    const title = newTaskTitles[shiftId]
    if (!title || title.trim() === '') return

    const description = newTaskDescs[shiftId] || ''
    const assignedToId = newTaskAssignees[shiftId] === 'any' ? undefined : newTaskAssignees[shiftId]

    startTransition(async () => {
      try {
        await addShiftTask(selectedDateStr, shiftId, title, description, assignedToId)
        // Clear input state
        setNewTaskTitles(prev => ({ ...prev, [shiftId]: '' }))
        setNewTaskDescs(prev => ({ ...prev, [shiftId]: '' }))
        setNewTaskAssignees(prev => ({ ...prev, [shiftId]: 'any' }))
      } catch (err: any) {
        alert(err.message || 'Erro ao adicionar tarefa.')
      }
    })
  }

  // Delete task from scale day
  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Deseja realmente excluir esta tarefa do checklist?')) return
    startTransition(async () => {
      try {
        await deleteShiftTask(taskId)
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir tarefa.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Calendar header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Link href="/gestor/turnos">
            <Button variant="outline" className="border-border hover:bg-card text-xs gap-1.5 h-9">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </Button>
          </Link>
          <span className="text-xs bg-card border border-border text-muted-foreground px-3 py-1.5 rounded-lg font-medium">
            Painel do Gestor
          </span>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold px-4 min-w-[120px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid legend */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legendas & Turnos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SHIFT_CLASSES).map(([key, style]) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${style.border}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span className={`text-xs font-medium text-foreground`}>
                {style.abbreviation} - {style.label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-red-900/40 bg-red-950/10">
            <Wrench className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-400">Manutenção Programada</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-card/40 border border-border rounded-xl overflow-hidden shadow-2xl relative">
        {/* Loading overlay */}
        {isPending && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-card border border-border p-4 rounded-xl shadow-xl">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-sm font-semibold text-foreground">Atualizando escala...</span>
            </div>
          </div>
        )}

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-border bg-card/80 text-center py-2.5 text-xs font-bold text-muted-foreground">
          {DAYS_OF_WEEK_SHORT.map((day, idx) => (
            <div key={idx}>{day}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border bg-background/20">
          {calendarCells.map((cell, idx) => {
            const { isMaintenanceDay, dayScales, totalTasks, doneTasks, hasAlert } = getCellData(cell.dateStr)

            let cellStyle = 'border-border hover:bg-card/30'
            if (isMaintenanceDay) {
              cellStyle = 'border-dashed border-red-900/30 bg-red-950/10 hover:bg-red-950/20'
            }

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDateStr(cell.dateStr)
                  setMaintenanceDesc('')
                }}
                className={`flex flex-col justify-between p-2.5 min-h-[96px] text-left transition-all focus:outline-none ${cellStyle} ${
                  !cell.isCurrentMonth ? 'opacity-30' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-mono font-bold ${cell.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {cell.dayNum}
                  </span>

                  {/* Warning dot */}
                  {hasAlert && !isMaintenanceDay && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-red-500/20 animate-pulse" />
                  )}
                  {isMaintenanceDay && (
                    <Wrench className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  )}
                </div>

                {/* Shifts scale mini-list */}
                <div className="mt-2 w-full space-y-1">
                  {!isMaintenanceDay ? (
                    dayScales.map((s: any) => {
                      const style = SHIFT_CLASSES[s.shift.name]
                      if (!style) return null
                      return (
                        <div key={s.id} className="text-[10px] flex items-center gap-1 font-medium bg-card/80 px-1 py-0.5 rounded border border-border text-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          <span className="font-bold text-muted-foreground">{style.abbreviation}:</span>
                          <span className="truncate max-w-[40px] sm:max-w-none">{s.operator.name.split(' ')[0]}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-[9px] text-red-400 font-bold bg-red-950/20 px-1 py-0.5 rounded border border-red-900/30 uppercase text-center tracking-wide">
                      BLOQUEADO
                    </div>
                  )}

                  {/* Tasks count indicator */}
                  {totalTasks > 0 && (
                    <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-0.5 mt-1 pt-1 border-t border-border/40">
                      <CheckSquare className="w-2.5 h-2.5" />
                      <span>{doneTasks}/{totalTasks} tarefas</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Slide-out day editor drawer */}
      {selectedDateStr && selectedCellData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-card/90 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <div>
                  <h2 className="text-base font-bold text-foreground">Editar Escala & Tarefas</h2>
                  <p className="text-xs text-muted-foreground capitalize">{formatPtDate(selectedDateStr)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDateStr(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Bloqueio de Manutenção Programada */}
              <div className="bg-background/40 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-foreground">Status de Funcionamento</span>
                  </div>
                  <Button
                    onClick={handleToggleMaintenance}
                    disabled={isPending}
                    variant={selectedCellData.isMaintenanceDay ? 'default' : 'outline'}
                    className={
                      selectedCellData.isMaintenanceDay
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50 text-xs h-8'
                        : 'border-red-900/40 bg-red-950/10 text-red-400 hover:bg-red-950/20 text-xs h-8'
                    }
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : selectedCellData.isMaintenanceDay ? (
                      <span className="flex items-center gap-1"><Unlock className="w-3 h-3" /> Liberar Operação</span>
                    ) : (
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Bloquear p/ Manutenção</span>
                    )}
                  </Button>
                </div>

                {selectedCellData.isMaintenanceDay ? (
                  <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3 space-y-1">
                    <p className="text-[11px] font-bold text-red-400">ETE BLOQUEADA PARA MANUTENÇÃO</p>
                    <p className="text-xs text-muted-foreground">
                      Motivo: {selectedCellData.maintenanceDayInfo?.description}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descrição do bloqueio (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Limpeza do reator biológico..."
                      value={maintenanceDesc}
                      onChange={(e) => setMaintenanceDesc(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                    />
                  </div>
                )}
              </div>

              {/* Escala de Operadores */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Escala do Dia
                </h3>
                {selectedCellData.isMaintenanceDay ? (
                  <p className="text-xs text-muted-foreground italic">Turnos de operação suspensos para este dia de manutenção.</p>
                ) : (
                  <div className="space-y-3">
                    {shifts.map((s) => {
                      const scale = selectedDayScales.find((sc) => sc.shift_id === s.id)
                      const style = SHIFT_CLASSES[s.name] || SHIFT_CLASSES.Folga

                      return (
                        <div key={s.id} className="p-4 rounded-xl border border-border bg-background/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                              <div>
                                <p className="text-xs font-bold text-foreground">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{s.start_time} - {s.end_time}</p>
                              </div>
                            </div>
                            {scale ? (
                              <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                                Escalado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border text-muted-foreground">
                                Vago
                              </Badge>
                            )}
                          </div>

                          {/* Seletor rápido de operador */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atribuir Operador</label>
                            <select
                              value={scale ? scale.operator_id : 'none'}
                              onChange={(e) => handleAssignOperator(s.id, e.target.value)}
                              disabled={isPending}
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-border"
                            >
                              <option value="none">-- Desalocado / Vago --</option>
                              {operators.map((op) => (
                                <option key={op.id} value={op.id}>
                                  {op.name} ({op.role === 'TECHNICIAN' ? 'Técnico' : 'Operador'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Checklist / Tarefas */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                  <CheckSquare className="w-4 h-4 text-amber-400" /> Gestão de Checklist e Tarefas
                </h3>

                {selectedCellData.isMaintenanceDay ? (
                  <p className="text-xs text-muted-foreground italic">Não é possível gerenciar tarefas em dias de manutenção programada.</p>
                ) : (
                  <div className="space-y-4">
                    {shifts.map((s) => {
                      const inst = selectedDayInstances.find((instance) => instance.shift_id === s.id)
                      const tasksList = inst ? inst.shift_tasks : []

                      return (
                        <div key={s.id} className="p-4 rounded-xl border border-border bg-background/20 space-y-3">
                          <h4 className="text-xs font-bold text-muted-foreground">Turno: {s.name}</h4>

                          {/* Existing Tasks */}
                          {tasksList.length > 0 ? (
                            <div className="space-y-2">
                              {tasksList.map((task: any) => (
                                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card/50">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate">{task.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {task.status === 'DONE' ? 'Concluída' : task.status === 'SKIPPED' ? 'Ignorada' : 'Pendente'}
                                      {task.assignee ? ` · Para: ${task.assignee.name.split(' ')[0]}` : ''}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleDeleteTask(task.id)}
                                    disabled={isPending}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-400/80 hover:text-red-400 hover:bg-red-950/30"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic pl-1">Nenhuma tarefa cadastrada para este turno.</p>
                          )}

                          {/* Inline Form to Add Task */}
                          <div className="pt-2 border-t border-border/40 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nova Tarefa</p>
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Título da tarefa..."
                                value={newTaskTitles[s.id] || ''}
                                onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                              />
                              <input
                                type="text"
                                placeholder="Descrição (opcional)..."
                                value={newTaskDescs[s.id] || ''}
                                onChange={(e) => setNewTaskDescs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={newTaskAssignees[s.id] || 'any'}
                                  onChange={(e) => setNewTaskAssignees(prev => ({ ...prev, [s.id]: e.target.value }))}
                                  className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-border"
                                >
                                  <option value="any">Qualquer operador</option>
                                  {operators.map((op) => (
                                    <option key={op.id} value={op.id}>{op.name}</option>
                                  ))}
                                </select>
                                <Button
                                  onClick={() => handleAddTask(s.id)}
                                  disabled={isPending || !newTaskTitles[s.id]?.trim()}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 h-8 flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Adicionar
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Análises e Ocorrências (Read-Only) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
                  <FileCheck className="w-4 h-4 text-sky-400" /> Outros Eventos do Dia
                </h3>
                
                {/* Schedules */}
                {selectedCellData.daySchedules.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-sky-400 tracking-wide uppercase">Análises de Rotina</p>
                    <div className="grid gap-2">
                      {selectedCellData.daySchedules.map((s) => (
                        <div key={s.id} className="p-3 rounded-lg border border-border bg-background/40 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-foreground">{s.collection_point.name}</span>
                            <span className="text-muted-foreground">{s.parameter.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Executor: {s.executor_role === 'OPERATOR' ? 'Operador' : 'Técnico'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Occurrences */}
                {selectedCellData.dayOccurrences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-red-400 tracking-wide uppercase">Ocorrências</p>
                    <div className="grid gap-2">
                      {selectedCellData.dayOccurrences.map((o) => (
                        <div key={o.id} className="p-3 rounded-lg border border-red-950/30 bg-red-950/5 text-xs space-y-0.5">
                          <div className="flex justify-between font-bold">
                            <span className="text-foreground">{o.collection_point?.name || 'Geral'}</span>
                            <span className="text-red-400">{o.severity}</span>
                          </div>
                          <p className="text-foreground">{o.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCellData.daySchedules.length === 0 && selectedCellData.dayOccurrences.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhum evento ou análise agendada para esta data.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
