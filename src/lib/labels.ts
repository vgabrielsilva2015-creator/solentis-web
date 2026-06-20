// Dicionários para tradução e humanização de Enums e Valores Padronizados do Prisma

export const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH: 'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

export const OCCURRENCE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvida',
}

export const OCCURRENCE_STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  IN_PROGRESS: 'bg-sky-950/60 text-sky-400 border-sky-900/50',
  RESOLVED: 'bg-green-950/60 text-green-400 border-green-900/50',
}

export const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const MAINTENANCE_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-slate-800 text-slate-400 border-slate-700',
  IN_PROGRESS: 'bg-sky-950/60 text-sky-400 border-sky-900/50',
  DONE: 'bg-green-950/60 text-green-400 border-green-900/50',
  CANCELLED: 'bg-red-950/60 text-red-400 border-red-900/50',
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE: 'Concluída',
  SKIPPED: 'Pulada',
}

export const TASK_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  DONE: 'bg-green-950/60 text-green-400 border-green-900/50',
  SKIPPED: 'bg-slate-800 text-slate-400 border-slate-700',
}

export const OCCURRENCE_CATEGORY_LABEL: Record<string, string> = {
  VAZAMENTO: 'Vazamento',
  QUEBRA: 'Quebra de Equipamento',
  FALTA_PRODUTO: 'Falta de Produto',
  SEGURANCA: 'Segurança/Risco',
  OUTROS: 'Outros',
}
