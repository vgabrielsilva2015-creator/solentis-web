/**
 * Regra de janela de abertura de turno (pura, testável, sem Prisma).
 *
 * Um turno só pode ser aberto dentro da sua janela de horário, com uma tolerância
 * de X minutos ANTES do início (padrão 60). Ex.: a Noite (22:00–06:00) pode ser
 * aberta a partir das 21:00, mas não às 15:38 (bug do piloto).
 *
 * Todo o cálculo é em minutos desde a meia-noite (hora local; o servidor roda com
 * TZ=America/Sao_Paulo via instrumentation.ts). Trata turnos que cruzam a
 * meia-noite (crosses_midnight).
 */

export const TOLERANCIA_ABERTURA_MIN = 60
const MINUTOS_DIA = 24 * 60

export type JanelaTurno = {
  start_time: string       // "HH:mm"
  end_time: string         // "HH:mm"
  crosses_midnight: boolean
}

/** "HH:mm" → minutos desde a meia-noite. */
function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Módulo sempre positivo (JS % pode devolver negativo). */
function mod(n: number, base: number): number {
  return ((n % base) + base) % base
}

/**
 * Minuto do dia (0–1439) a partir do qual o turno pode ser aberto: início − tolerância,
 * com wrap correto (ex.: 00:30 com tolerância 60 → 23:30 do dia anterior).
 */
export function minutoAberturaPermitida(
  startStr: string,
  toleranciaMin: number = TOLERANCIA_ABERTURA_MIN,
): number {
  return mod(parseMinutos(startStr) - toleranciaMin, MINUTOS_DIA)
}

/** "HH:mm" a partir do qual o turno pode ser aberto (para exibir na mensagem). */
export function horaAberturaPermitida(
  startStr: string,
  toleranciaMin: number = TOLERANCIA_ABERTURA_MIN,
): string {
  const m = minutoAberturaPermitida(startStr, toleranciaMin)
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * True se o turno pode ser aberto no instante `now`. A janela vai de
 * (start − tolerância) até end (fim exclusivo), cruzando a meia-noite quando
 * `crosses_midnight` OU quando a tolerância empurra o início para antes de 00:00.
 */
export function podeAbrirTurnoAgora(
  turno: JanelaTurno,
  now: Date,
  toleranciaMin: number = TOLERANCIA_ABERTURA_MIN,
): boolean {
  const atual = now.getHours() * 60 + now.getMinutes()
  const janelaStart = minutoAberturaPermitida(turno.start_time, toleranciaMin)
  const fim = parseMinutos(turno.end_time)
  const cruzaMeiaNoite = turno.crosses_midnight || fim <= janelaStart
  return cruzaMeiaNoite
    ? atual >= janelaStart || atual < fim
    : atual >= janelaStart && atual < fim
}
