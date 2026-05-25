export function normalizarData(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calcularTimeoutAt(handoverAt: Date, timeoutMinutes: number): Date {
  return new Date(handoverAt.getTime() + timeoutMinutes * 60 * 1000)
}

export function isHandoverVencido(timeoutAt: Date, now: Date): boolean {
  return timeoutAt < now
}
