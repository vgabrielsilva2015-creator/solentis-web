/**
 * Busca global (T-17): o que cada perfil pode buscar e para onde cada resultado leva.
 *
 * Antes: busca sensível a maiúsculas e acentos ("reator" não achava "Reator";
 * "biologico" não achava "Biológico"), qualquer perfil via equipamentos e
 * ocorrências, e os links apontavam para telas do gestor/técnico mesmo para o
 * operador (que caía em "acesso negado").
 */
export type SearchType = 'equipment' | 'point' | 'occurrence'

export interface SearchHit { id: string; type: SearchType; title: string; subtitle: string; href: string }

/** Tipos que cada perfil pode buscar e a tela de destino de cada um. */
export const SEARCH_ROUTES: Record<string, Partial<Record<SearchType, (id: string) => string>>> = {
  MANAGER: {
    equipment: (id) => `/gestor/equipamentos/${id}`,
    point: (id) => `/gestor/pontos-de-coleta/${id}`,
    occurrence: (id) => `/gestor/ocorrencias/${id}`,
  },
  TECHNICIAN: {
    equipment: (id) => `/tecnico/equipamentos/${id}`,
    occurrence: (id) => `/tecnico/ocorrencias/${id}`,
  },
  OPERATOR: {
    occurrence: (id) => `/operador/ocorrencias/${id}`,
  },
  MAINTENANCE: {
    equipment: (id) => `/manutencao/equipamentos/${id}`,
  },
}

export function allowedTypes(role: string): SearchType[] {
  return Object.keys(SEARCH_ROUTES[role] ?? {}) as SearchType[]
}

export function hrefFor(role: string, type: SearchType, id: string): string | null {
  const f = SEARCH_ROUTES[role]?.[type]
  return f ? f(id) : null
}

/** Normaliza o termo e monta o padrão LIKE escapando curingas digitados. */
export function likePattern(q: string): string | null {
  const termo = q.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (termo.length < 2 || termo.length > 80) return null
  return `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export function excerpt(text: string, max = 60): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
