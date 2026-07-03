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

export type TurnoJanela = {
  id: string
  name: string
  start_time: string
  end_time: string
  crosses_midnight: boolean
}

/** Converte "HH:MM" em minutos desde a meia-noite. */
function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * True se `currentMinutes` (0–1439, minutos desde a meia-noite local) cai dentro
 * da janela do turno. Trata turnos que cruzam a meia-noite (ex.: 22:00–06:00).
 * Início inclusivo, fim exclusivo.
 */
export function isHorarioNoTurno(
  startStr: string,
  endStr: string,
  crossesMidnight: boolean,
  currentMinutes: number,
): boolean {
  const start = parseMinutos(startStr)
  const end = parseMinutos(endStr)
  if (crossesMidnight) {
    return currentMinutes >= start || currentMinutes < end
  }
  return currentMinutes >= start && currentMinutes < end
}

/**
 * Retorna o primeiro turno cuja janela contém o horário local de `now`, ou null.
 * Usa a hora local do servidor (TZ=America/Sao_Paulo via instrumentation.ts).
 */
export function encontrarTurnoAtual<T extends TurnoJanela>(shifts: T[], now: Date): T | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return (
    shifts.find((s) =>
      isHorarioNoTurno(s.start_time, s.end_time, s.crosses_midnight, currentMinutes),
    ) ?? null
  )
}
