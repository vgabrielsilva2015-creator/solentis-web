// Dicionários para tradução e humanização de Enums e Valores Padronizados do Prisma

export const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'bg-ok-soft text-ok border-ok/30',
  MEDIUM: 'bg-warn-soft text-warn border-warn/30',
  HIGH: 'bg-danger-soft text-danger border-danger/30',
  CRITICAL: 'bg-critical-soft text-critical border-critical/30',
}

export const OCCURRENCE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvida',
}

export const OCCURRENCE_STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-warn-soft text-warn border-warn/30',
  IN_PROGRESS: 'bg-c-brand-soft text-c-brand border-c-brand/30',
  RESOLVED: 'bg-ok-soft text-ok border-ok/30',
}

export const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const MAINTENANCE_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-muted text-muted-foreground border-border',
  IN_PROGRESS: 'bg-c-brand-soft text-c-brand border-c-brand/30',
  DONE: 'bg-ok-soft text-ok border-ok/30',
  CANCELLED: 'bg-danger-soft text-danger border-danger/30',
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE: 'Concluída',
  SKIPPED: 'Pulada',
}

export const TASK_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-warn-soft text-warn border-warn/30',
  DONE: 'bg-ok-soft text-ok border-ok/30',
  SKIPPED: 'bg-muted text-muted-foreground border-border',
}

export const OCCURRENCE_CATEGORY_LABEL: Record<string, string> = {
  VAZAMENTO: 'Vazamento',
  QUEBRA: 'Quebra de Equipamento',
  FALTA_PRODUTO: 'Falta de Produto',
  SEGURANCA: 'Segurança/Risco',
  OUTROS: 'Outros',
}

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  CRITICAL: 'Urgent/Crítica',
}

export const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground border-border',
  MEDIUM: 'bg-warn-soft text-warn border-warn/30',
  NORMAL: 'bg-c-brand-soft text-c-brand border-c-brand/30',
  HIGH: 'bg-danger-soft text-danger border-danger/30',
  CRITICAL: 'bg-critical-soft text-critical border-critical/30',
}
