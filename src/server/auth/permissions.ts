/**
 * Matriz de permissões (T-20): quem pode fazer o quê. Fonte única para as
 * server actions (via `requirePermission`/`permissionError` em ./guards) e para
 * o acesso às áreas de tela (`AREA_ACCESS`, usado pelo proxy).
 *
 * Arquivo puro (sem Next/Prisma): testável e importável no proxy.
 *
 * Decisões do dono do produto (08/10/2026), marcadas "DECISÃO" abaixo:
 *  1. Gestor consulta e altera o que é do operador: registra leitura e mexe no estoque.
 *  2. Operador registra, acompanha E resolve ocorrência — toda resolução fica
 *     registrada com responsável, data/hora e a ação tomada (evidência quando houver).
 *  3. Manutenção registra ocorrências.
 *  4. Técnico registra leitura de campo (como já era).
 * Prioridade declarada: rastreabilidade e separação de responsabilidades.
 */

export const ROLES = ['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE', 'SUPER_ADMIN'] as const
export type AppRole = (typeof ROLES)[number]

const OP = 'OPERATOR', TEC = 'TECHNICIAN', GES = 'MANAGER', MAN = 'MAINTENANCE', SUP = 'SUPER_ADMIN'

export const PERMISSIONS = {
  // ── Campo (telas do operador) ─────────────────────────────────────────────
  /** Registrar leitura de campo. DECISÃO 1 (gestor) e 4 (técnico). */
  'reading.create': [OP, TEC, GES],
  /** Saída e contagem física de produto químico. DECISÃO 1: gestor também. */
  'stock.move': [OP, TEC, GES],
  /** Entrada de produto químico (recebimento). */
  'stock.receive': [GES, TEC],

  // ── Ocorrências ───────────────────────────────────────────────────────────
  /** Registrar e comentar. DECISÃO 3: Manutenção também. */
  'occurrence.create': [OP, TEC, GES, MAN],
  /** Mudar a coluna do kanban (aberta, em andamento, aguardando). */
  'occurrence.move': [OP, TEC, GES],
  /** Resolver, ou reabrir uma resolvida. Sempre com a ação descrita (src/server/occurrences/resolve.ts). DECISÃO 2. */
  'occurrence.resolve': [OP, TEC, GES],

  // ── Turnos ────────────────────────────────────────────────────────────────
  /** Abrir turno, passagem, confirmar, assumir posto, concluir/pular/repetir tarefa. */
  'shift.operate': [OP],
  /** Atribuir/remover tarefa de um turno e tarefas-padrão do turno. */
  'shift.assign': [GES, TEC],
  /** Cadastro de turnos, escala, pré-agendamento e correção de passagem. */
  'shift.manage': [GES],

  // ── Laboratório ───────────────────────────────────────────────────────────
  'analysis.create': [TEC],
  'analysis.approve': [TEC, GES],
  /** Importar laudo externo (IA) e salvar os resultados. */
  'lab.import': [GES],

  // ── Equipamentos e manutenção ─────────────────────────────────────────────
  /** Cadastrar/editar equipamento, concluir preventiva, abrir/atualizar corretiva. */
  'equipment.maintain': [TEC, GES, MAN],
  /** Validar OS concluída (status VALIDATED). */
  'maintenance.validate': [GES],
  /** Agendar preventiva e abrir corretiva pelo painel do gestor. */
  'maintenance.plan': [GES],

  // ── Gestão ────────────────────────────────────────────────────────────────
  /** Parâmetros, pontos, categorias, produtos, prazos de ocorrência, cronograma. */
  'config.manage': [GES],
  'users.manage': [GES],
  /** Relatórios e detalhes do painel do gestor. */
  'dashboard.view': [GES],
  /** Exportar CSV (/api/export). */
  'data.export': [GES],

  // ── Plataforma ────────────────────────────────────────────────────────────
  'platform.admin': [SUP],
} as const satisfies Record<string, readonly AppRole[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: string | null | undefined, perm: Permission): boolean {
  return !!role && (PERMISSIONS[perm] as readonly string[]).includes(role)
}

/** Áreas de tela: prefixo da rota → perfis que entram (o proxy redireciona os demais). */
export const AREA_ACCESS: Record<string, readonly AppRole[]> = {
  '/gestor': [GES],
  '/tecnico': [TEC, GES],
  '/operador': [OP, TEC, GES],
  '/manutencao': [MAN, GES],
  '/admin': [SUP],
}

/** Mensagem curta para a tela quando o perfil não pode fazer a ação. */
export const PERMISSION_DENIED_MESSAGE: Partial<Record<Permission, string>> = {
  'shift.operate': 'Apenas operadores podem fazer esta ação no turno.',
  'stock.move': 'Seu perfil não pode registrar saída e contagem de estoque.',
  'maintenance.validate': 'Apenas Gestores podem validar Ordens de Serviço concluídas.',
}
export const DEFAULT_DENIED_MESSAGE = 'Seu perfil não pode fazer esta ação.'
