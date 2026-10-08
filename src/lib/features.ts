/**
 * Catálogo de recursos (módulos) do Solentis — base para o sistema de "opcionais" por planta.
 *
 * Conceito (analogia do carro):
 *  - `base: true`  → vem "de fábrica" em TODA planta, sempre ligado, não dá pra desligar.
 *                    São todos os módulos que o app já tem hoje.
 *  - `base: false` → OPCIONAL: ligado/desligado por planta pelo SUPER_ADMIN (nunca pelo gestor).
 *                    `defaultEnabled` define se vem ligado quando a planta é criada.
 *
 * Como adicionar um opcional no futuro: acrescente uma entrada com `base: false` e
 * `defaultEnabled: false`, e proteja o módulo com `isFeatureEnabled(tenant.features, 'chave')`.
 * O botão de opcionais no super admin já exibe automaticamente tudo que tiver `base: false`.
 */

export interface FeatureDef {
  key: string
  label: string
  description: string
  base: boolean
  defaultEnabled: boolean
}

export const FEATURES: readonly FeatureDef[] = [
  // ── De fábrica (todos os módulos atuais) ────────────────────────────────────
  { key: 'dashboard',    label: 'Dashboard',              description: 'Indicadores e visão geral por perfil.',                      base: true, defaultEnabled: true },
  { key: 'leituras',     label: 'Leituras de campo',      description: 'Registro de leituras do operador com detecção de limite.',   base: true, defaultEnabled: true },
  { key: 'analises',     label: 'Análises laboratoriais', description: 'Análises, aprovação e tendência (CONAMA).',                   base: true, defaultEnabled: true },
  { key: 'ocorrencias',  label: 'Ocorrências',            description: 'Registro, prazos por severidade e resolução.',               base: true, defaultEnabled: true },
  { key: 'turnos',       label: 'Turnos e tarefas',       description: 'Abertura, passagem de turno e tarefas por turno.',            base: true, defaultEnabled: true },
  { key: 'manutencao',   label: 'Equipamentos e manutenção', description: 'Equipamentos, preventivas e corretivas.',                 base: true, defaultEnabled: true },
  { key: 'estoque',      label: 'Estoque de produtos químicos', description: 'Entradas, saídas, contagem e alertas de estoque.',     base: true, defaultEnabled: true },
  { key: 'agenda',       label: 'Agenda / cronograma',    description: 'Cronograma de monitoramento e prazos.',                       base: true, defaultEnabled: true },
  { key: 'exportacao',   label: 'Exportação (CSV/PDF)',   description: 'Exportação de dados e relatórios.',                           base: true, defaultEnabled: true },
  { key: 'laudos_ia',    label: 'Leitura de laudos com IA', description: 'Importação de laudos externos com extração por IA.',        base: true, defaultEnabled: true },
  { key: 'notificacoes', label: 'Notificações',           description: 'Push e alertas de não-conformidade.',                        base: true, defaultEnabled: true },
  { key: 'auditoria',    label: 'Auditoria',              description: 'Trilha de auditoria de mudanças.',                            base: true, defaultEnabled: true },
  { key: 'usuarios',     label: 'Usuários',               description: 'Cadastro e gestão de usuários da planta.',                    base: true, defaultEnabled: true },

  // ── Opcionais (futuros) ─────────────────────────────────────────────────────
  // Acrescente aqui entradas com base: false conforme forem lançadas.
]

export const FEATURE_KEYS = FEATURES.map((f) => f.key)

/** Estrutura guardada em `Tenant.features` (JSON). Só os opcionais precisam constar aqui. */
export type TenantFeatures = Record<string, boolean>

/**
 * Um recurso está ligado para a planta?
 *  - base → sempre ligado;
 *  - opcional → lê de `features[key]`, caindo no `defaultEnabled` se não houver valor.
 * Chave desconhecida → false (fail-closed para recurso que não existe no catálogo).
 */
export function isFeatureEnabled(features: TenantFeatures | null | undefined, key: string): boolean {
  const def = FEATURES.find((f) => f.key === key)
  if (!def) return false
  if (def.base) return true
  return features?.[key] ?? def.defaultEnabled
}

/** Normaliza o JSON cru vindo do banco em um mapa de booleanos seguro. */
export function parseTenantFeatures(raw: unknown): TenantFeatures {
  if (!raw || typeof raw !== 'object') return {}
  const out: TenantFeatures = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'boolean') out[k] = v
  }
  return out
}
