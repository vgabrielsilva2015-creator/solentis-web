/**
 * Destinos das notificações do sino (T-18 / B-08). Ocorrência e equipamento
 * usam as mesmas rotas da busca (`hrefFor` em src/lib/search.ts); aqui ficam os
 * destinos que só a notificação tem.
 */

/** Tarefa pendente do turno aberto pelo próprio usuário. */
export function notificationTaskHref(role: string, shiftInstanceId: string): string {
  if (role === 'OPERATOR') return `/operador/turnos/${shiftInstanceId}/tarefas`
  if (role === 'MANAGER') return `/gestor/turnos/tarefas/${shiftInstanceId}`
  return '/tecnico/turnos/tarefas'
}

/** Passagem vencida (só o gestor recebe): abre o detalhe da instância do turno. */
export const HANDOVER_ALERT_HREF = (shiftInstanceId: string) => `/gestor/turnos/tarefas/${shiftInstanceId}`
