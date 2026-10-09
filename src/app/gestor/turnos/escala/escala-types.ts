/**
 * Tipos dos dados da tela de escala (gestor e operador), derivados das MESMAS consultas que as
 * páginas fazem (`include`/`select` abaixo precisam acompanhar `escala/page.tsx` dos dois perfis).
 * Só tipos: nada daqui vai para o navegador.
 */
import type { Prisma } from '@prisma/client'

export type EscalaScale = Prisma.ShiftScaleGetPayload<{
  include: {
    shift: { select: { id: true; name: true; start_time: true; end_time: true; crosses_midnight: true } }
    operator: { select: { id: true; name: true; email: true } }
  }
}>

export type EscalaMaintenanceDay = Prisma.MaintenanceDayGetPayload<object>

export type EscalaShiftInstance = Prisma.ShiftInstanceGetPayload<{
  include: {
    shift: { select: { id: true; name: true } }
    shift_tasks: {
      include: {
        assignee: { select: { id: true; name: true } }
        completer: { select: { id: true; name: true } }
      }
    }
    opener: { select: { id: true; name: true } }
  }
}>

export type EscalaTask = EscalaShiftInstance['shift_tasks'][number]

export type EscalaPreventive = Prisma.PreventiveMaintenanceGetPayload<{
  include: { equipment: { select: { id: true; name: true; serial_number: true } } }
}>

export type EscalaCorrective = Prisma.CorrectiveMaintenanceGetPayload<{
  include: {
    equipment: { select: { id: true; name: true } }
    responsible: { select: { id: true; name: true } }
  }
}>

export type EscalaOccurrence = Prisma.OccurrenceGetPayload<{
  include: {
    collection_point: { select: { id: true; name: true } }
    reporter: { select: { id: true; name: true } }
  }
}>

export type EscalaSchedule = Prisma.MonitoringScheduleGetPayload<{
  include: {
    collection_point: { select: { id: true; name: true } }
    parameter: { select: { id: true; name: true; unit: true } }
  }
}>

export type EscalaShift = Prisma.ShiftGetPayload<object>

export type EscalaOperator = Prisma.UserGetPayload<{ select: { id: true; name: true; email: true; role: true } }>
