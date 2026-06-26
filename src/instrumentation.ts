/**
 * Hook de instrumentação do Next.js — executa uma vez no startup do servidor.
 *
 * A Vercel reserva a env var `TZ` (não dá para setar pelo painel) e roda o
 * Node em UTC. Definimos o fuso da operação aqui, no início do processo, para
 * que TODAS as formatações de data/hora no servidor (toLocale*, etc.) usem o
 * horário de Brasília sem precisar passar timeZone em cada chamada.
 */
export function register() {
  process.env.TZ = 'America/Sao_Paulo'
}
