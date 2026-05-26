// Enums do domínio — definidos em TypeScript porque Prisma v5 + SQLite não suporta enums nativos.
// O banco armazena como String; a aplicação garante os valores válidos via estes tipos.

// ─── Identidade ───────────────────────────────────────────────────────────────

export type Role = 'OPERATOR' | 'TECHNICIAN' | 'MANAGER'

export const ROLES = {
  OPERATOR:   'OPERATOR',
  TECHNICIAN: 'TECHNICIAN',
  MANAGER:    'MANAGER',
} as const satisfies Record<Role, Role>

// ─── Operação ─────────────────────────────────────────────────────────────────

export type DataOrigin = 'MANUAL' | 'SENSOR' | 'IMPORT'

export const DATA_ORIGINS = {
  MANUAL: 'MANUAL',
  SENSOR: 'SENSOR',
  IMPORT: 'IMPORT',
} as const satisfies Record<DataOrigin, DataOrigin>

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export type OccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const OCCURRENCE_SEVERITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<OccurrenceSeverity, OccurrenceSeverity>

export type OccurrenceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export const OCCURRENCE_STATUSES = {
  OPEN:        'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED:    'RESOLVED',
} as const satisfies Record<OccurrenceStatus, OccurrenceStatus>

// ─── Manutenções ──────────────────────────────────────────────────────────────

// Preventiva usa: SCHEDULED / COMPLETED / OVERDUE
// Corretiva usa: IN_PROGRESS / COMPLETED / CANCELLED
export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'

export const MAINTENANCE_STATUSES = {
  SCHEDULED:   'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  OVERDUE:     'OVERDUE',
  CANCELLED:   'CANCELLED',
} as const satisfies Record<MaintenanceStatus, MaintenanceStatus>

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const PRIORITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<Priority, Priority>

// ─── Turnos ───────────────────────────────────────────────────────────────────

export type ShiftInstanceStatus = 'OPEN' | 'HANDOVER_PENDING' | 'CLOSED'

export const SHIFT_INSTANCE_STATUSES = {
  OPEN:             'OPEN',
  HANDOVER_PENDING: 'HANDOVER_PENDING',
  CLOSED:           'CLOSED',
} as const satisfies Record<ShiftInstanceStatus, ShiftInstanceStatus>

export type HandoverStatus = 'PENDING' | 'CONFIRMED' | 'TIMED_OUT'

export const HANDOVER_STATUSES = {
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  TIMED_OUT: 'TIMED_OUT',
} as const satisfies Record<HandoverStatus, HandoverStatus>

// ─── Estoque de Produtos Químicos ─────────────────────────────────────────────

export const CHEMICAL_UNITS_PRESET = [
  'kg', 'g', 'L', 'mL', 'unidade', 'saco', 'galão', 'tambor',
] as const

export type ChemicalUnitPreset = typeof CHEMICAL_UNITS_PRESET[number]

// Usado no select da UI: os presets + opção "Outro" para texto livre
export const CHEMICAL_UNIT_OPTIONS = [
  ...CHEMICAL_UNITS_PRESET.map((u) => ({ value: u, label: u })),
  { value: 'outro', label: 'Outro...' },
] as const

// ─── Rastreabilidade ──────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const satisfies Record<AuditAction, AuditAction>
