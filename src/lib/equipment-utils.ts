export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isOverdue(scheduledDate: Date, today: Date): boolean {
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  const s = new Date(scheduledDate)
  s.setHours(0, 0, 0, 0)
  return s < t
}
