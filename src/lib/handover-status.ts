/**
 * Status da passagem de turno calculado na leitura (T-18 / B-11).
 *
 * Antes: a página /operador/turnos chamava `aplicarTimeouts()` ao renderizar e
 * gravava TIMED_OUT no banco (escrita num GET). Pior: depois disso a passagem
 * não podia mais ser confirmada (a confirmação só aceitava PENDING) e o turno
 * ficava preso em HANDOVER_PENDING para sempre — nem "assumir posto" funcionava,
 * porque ele exige turno OPEN.
 *
 * Regra do briefing (seção E): "Turno anterior só é oficialmente fechado após
 * confirmação do entrante. Se a confirmação não ocorrer dentro do timeout, gera
 * alerta pro gestor." Ou seja, o timeout é um ALERTA, não um bloqueio:
 *   - o status gravado continua PENDING até alguém confirmar;
 *   - "vencida" é calculado aqui, comparando timeout_at com agora;
 *   - a confirmação atrasada continua permitida e fica registrada como atrasada
 *     (confirmed_at > timeout_at);
 *   - linhas antigas já gravadas como TIMED_OUT também podem ser confirmadas
 *     (destrava os turnos presos, sem precisar mexer nos dados).
 */

export type HandoverStatusGravado = 'PENDING' | 'CONFIRMED' | 'TIMED_OUT' | string
export type HandoverStatusEfetivo = 'PENDING' | 'TIMED_OUT' | 'CONFIRMED' | 'CONFIRMED_LATE'

export interface HandoverTiming {
  status: HandoverStatusGravado
  timeout_at: Date | string
  confirmed_at?: Date | string | null
}

/** Status gravados que ainda aguardam o entrante. */
export const STATUS_AGUARDANDO = ['PENDING', 'TIMED_OUT'] as const

export function aguardandoConfirmacao(status: HandoverStatusGravado): boolean {
  return (STATUS_AGUARDANDO as readonly string[]).includes(status)
}

export function passagemVencida(h: HandoverTiming, now: Date = new Date()): boolean {
  return aguardandoConfirmacao(h.status) && new Date(h.timeout_at).getTime() < now.getTime()
}

export function statusEfetivoPassagem(h: HandoverTiming, now: Date = new Date()): HandoverStatusEfetivo {
  if (h.status === 'CONFIRMED') {
    const conf = h.confirmed_at ? new Date(h.confirmed_at).getTime() : null
    return conf !== null && conf > new Date(h.timeout_at).getTime() ? 'CONFIRMED_LATE' : 'CONFIRMED'
  }
  return passagemVencida(h, now) ? 'TIMED_OUT' : 'PENDING'
}

export const HANDOVER_STATUS_LABEL: Record<HandoverStatusEfetivo, string> = {
  PENDING: 'Aguardando confirmação',
  TIMED_OUT: 'Sem confirmação no prazo',
  CONFIRMED: 'Confirmada',
  CONFIRMED_LATE: 'Confirmada com atraso',
}
