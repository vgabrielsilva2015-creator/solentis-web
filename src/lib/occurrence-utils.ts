// Prazos em horas por severidade — espelha occurrence_severity_defaults do seed
export const DEADLINE_HOURS: Record<string, number> = {
  CRITICAL: 24,
  HIGH:     72,
  MEDIUM:   168,
  LOW:      720,
}

export function calcularDeadline(severity: string, createdAt: Date): Date {
  const hours = DEADLINE_HOURS[severity] ?? 168
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000)
}

export function isPrazoVencido(deadline: Date, now: Date): boolean {
  return deadline < now
}

export function isMimeTypeValido(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
}
