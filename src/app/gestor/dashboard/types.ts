/**
 * Formatos dos dados que o servidor (`page.tsx`) entrega ao painel do gestor (`dashboard-client.tsx`
 * e `components/*`). Só tipos. Os que vêm das consultas reaproveitam os tipos de
 * `src/server/dashboard/queries.ts`.
 */
import type { AlertaPainel, PontoTendencia } from '@/server/dashboard/queries'

/** Ponto do gráfico de tendência já com a data real e o rótulo de hora. */
export type DashboardTrendPoint = Omit<PontoTendencia, 'time' | 'value'> & { time: Date; timeStr: string; value: number }

/** Ocorrência aberta mostrada em "Alertas ativos". */
export type DashboardOccurrence = AlertaPainel

/** Linha do feed de atividades recentes. */
export interface DashboardFeedItem {
  time: string
  who: string
  text: string
  type: string
}

/** Preventiva próxima ou atrasada. */
export interface DashboardMaintenanceItem {
  id: string
  name: string
  equipmentId: string
  scheduledDate: string
  days: number
}

/** Parâmetro de qualidade selecionável no gráfico. */
export interface DashboardParameter {
  id: string
  name: string
  unit: string
  min_limit: number | null
  max_limit: number | null
}

/** Última medição / última não conformidade do dia (campo, análise interna ou laudo). */
export interface DashboardLatest {
  date: Date
  parameterName: string
  pointName: string
  value: number | null
  unit: string
  isNonConformant?: boolean
}
