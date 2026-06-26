import { fromZonedTime } from 'date-fns-tz'

/**
 * Fuso horário da operação. As ETEs atendidas operam no horário de Brasília.
 * Centralizado aqui para facilitar tornar configurável por tenant no futuro.
 */
export const APP_TIMEZONE = 'America/Sao_Paulo'

/**
 * Converte o valor de um <input type="datetime-local"> (ou date) — que é uma
 * hora "de parede" sem fuso — para o instante UTC correto, assumindo que o
 * usuário digitou no horário de Brasília.
 *
 * Sem isso, `new Date("2026-06-26T13:18")` é interpretado no fuso do servidor
 * (UTC na Vercel), gravando a hora errada.
 */
export function localInputToUTC(value: string): Date {
  return fromZonedTime(value, APP_TIMEZONE)
}

/** Formata só a data (dd/mm/aaaa) sempre no fuso da operação. */
export function formatDateDisplay(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  })
}

/** Formata só a hora (HH:mm) sempre no fuso da operação. */
export function formatTimeDisplay(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  })
}

/** Formata data + hora (dd/mm HH:mm) sempre no fuso da operação. */
export function formatDateTimeDisplay(date: Date | string, withYear = false) {
  const d = new Date(date)
  const datePart = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: APP_TIMEZONE,
  })
  return `${datePart} ${formatTimeDisplay(d)}`
}
