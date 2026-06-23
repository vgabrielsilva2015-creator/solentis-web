/**
 * Testes dos 13 cenários críticos — Briefing seção 5
 *
 * Cenários 1 e 2 (localStorage e reconexão automática): testes manuais — ver RUNBOOK
 * Cenário  4 (RUNBOOK com recomendação de no-break): documentação — ver RUNBOOK
 * Cenários 5, 10, 12 têm cobertura primária em analises/equipamentos/auth.test.ts;
 *   aqui são validados pelo ângulo dos critérios de aceite específicos do briefing.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { isOverdue, addDays }       from '@/lib/equipment-utils'
import { isRouteAllowedForRole, getDashboardRoute } from '@/lib/auth-utils'

// ── Schemas inline (espelham os das Server Actions; testam a lógica pura) ─────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const LeituraSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  value: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
}).refine(
  (d) => d.parameter_id === null || d.value !== null,
  { message: 'Informe o valor medido', path: ['value'] },
)

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

// Espelha normalizarData() de turnos/actions.ts — apenas data, sem hora
function normalizarParaMeiaNite(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Cenário 3 — Integridade transacional ────────────────────────────────────
// A validação Zod ocorre ANTES de qualquer escrita no banco.
// Se o schema rejeita, a Server Action retorna erro e o $transaction nunca abre.

describe('Cenário 3 — Integridade transacional: Zod bloqueia antes do banco', () => {
  it('LeituraSchema rejeita quando ponto de coleta está vazio', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: '',
      parameter_id:        null,
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Selecione o ponto'))).toBe(true)
  })

  it('LeituraSchema rejeita quando parâmetro é informado mas valor está ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Informe o valor medido'))).toBe(true)
  })

  it('LeituraSchema rejeita data/hora ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        null,
      value:               null,
      recorded_at:         '',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('data/hora'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita descrição com menos de 5 caracteres', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'abc', severity: 'LOW' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('5 caracteres'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita severidade fora do enum', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Descrição válida aqui', severity: 'ULTRA' })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema aceita dados completamente válidos', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Vazamento no reator', severity: 'HIGH' })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 5 — Análise fora do limite → is_non_conformant = true ────────────
// Cobertura primária: analises.test.ts (pH=11, DBO5=120, boundaries).
// Aqui: validação do critério de aceite literal do briefing.

describe('Cenário 5 — Não-conformidade detectada e sinalizada', () => {
  it('pH = 11 com limite máximo 9 → não-conforme (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, null, 9)).toBe(true)
  })

  it('pH = 7 com faixa 6–9 → conforme', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo → conforme (boundary inclusivo CONAMA)', () => {
    expect(calcularNaoConformidade(9, null, 9)).toBe(false)
  })
})

// ─── Cenário 6 — Non-MANAGER tenta editar turno fechado → bloqueado ──────────
// A rota /gestor/turnos/tarefas/* exige MANAGER.
// O middleware (ROLE_PREFIXES) bloqueia OPERATOR e TECHNICIAN antes de chegar na action.

describe('Cenário 6 — Acesso por perfil: apenas MANAGER edita passagens de turno', () => {
  it('OPERATOR é bloqueado em /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc/editar', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc/editar', 'TECHNICIAN')).toBe(false)
  })

  it('MANAGER acessa /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 7 — MANAGER edita sem justificativa → schema bloqueia ───────────

describe('Cenário 7 — EditHandoverSchema: justificativa obrigatória (≥ 10 chars)', () => {
  it('justificativa vazia → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '',
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('10 caracteres'))).toBe(true)
  })

  it('justificativa com 9 chars → inválido (um abaixo do mínimo)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '123456789', // 9 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })

  it('campo justification ausente → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      outgoing_observations: 'Obs válida',
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})

// ─── Cenário 8 — MANAGER edita com justificativa → schema aceita ─────────────

describe('Cenário 8 — EditHandoverSchema: justificativa válida é aceita', () => {
  it('justificativa com 10+ chars → válido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Correção solicitada pelo supervisor após revisão.',
      outgoing_observations: 'Turno sem incidentes.',
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })

  it('observações opcionais em branco são normalizadas para null pelo preprocess', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Ajuste de registro conforme auditoria 2026.',
      outgoing_observations: '',
      incoming_observations: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.outgoing_observations).toBeNull()
      expect(r.data.incoming_observations).toBeNull()
    }
  })

  it('justificativa exatamente com 10 chars → válido (boundary)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '1234567890', // exatamente 10 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 9 — Dois operadores tentam abrir o mesmo turno → bloqueado ──────
// A lógica de bloqueio usa $transaction com findFirst por (shift_id, date, status).
// Aqui testamos que a normalização de data garante que instâncias do mesmo dia
// colidam, independente do horário em que foram abertas.

describe('Cenário 9 — Turno duplicado: normalização de data garante unicidade diária', () => {
  it('abertura às 07h e às 15h no mesmo dia produzem a mesma meia-noite', () => {
    const manha = normalizarParaMeiaNite(new Date('2026-05-26T07:00:00'))
    const tarde = normalizarParaMeiaNite(new Date('2026-05-26T15:00:00'))
    expect(manha.getTime()).toBe(tarde.getTime())
  })

  it('abertura à 22h30 também cai na meia-noite do mesmo dia', () => {
    const noite   = normalizarParaMeiaNite(new Date('2026-05-26T22:30:00'))
    const referencia = normalizarParaMeiaNite(new Date('2026-05-26T00:00:00'))
    expect(noite.getTime()).toBe(referencia.getTime())
  })

  it('dias diferentes produzem meia-noites diferentes → não colidem', () => {
    const hoje   = normalizarParaMeiaNite(new Date('2026-05-26T10:00:00'))
    const amanha = normalizarParaMeiaNite(new Date('2026-05-27T06:00:00'))
    expect(hoje.getTime()).not.toBe(amanha.getTime())
  })
})

// ─── Cenário 10 — Equipamento com preventiva vencida → destaque vermelho ─────
// Cobertura primária: equipamentos.test.ts (addDays, isOverdue + boundaries).
// Aqui: critério de aceite do briefing — "equipamento vencido → destaque vermelho".

describe('Cenário 10 — isOverdue: equipamento com preventiva atrasada é sinalizado', () => {
  it('preventiva agendada para ontem → vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, -1), today)).toBe(true)
  })

  it('preventiva agendada para hoje → não vencida (boundary)', () => {
    const today = new Date()
    expect(isOverdue(today, today)).toBe(false)
  })

  it('preventiva agendada para amanhã → não vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, 1), today)).toBe(false)
  })
})

// ─── Cenário 11 — Primeiro login com credencial provisória → troca de senha ──
// O redirect para /trocar-senha quando mustChangePassword=true está no middleware.
// O test E2E manual está documentado no RUNBOOK.
// Aqui: getDashboardRoute garante que o destino pós-troca é o dashboard correto.

describe('Cenário 11 — must_change_password: dashboard correto após troca de senha', () => {
  it('MANAGER é direcionado para /gestor/dashboard', () => {
    expect(getDashboardRoute('MANAGER')).toBe('/gestor/dashboard')
  })

  it('TECHNICIAN é direcionado para /tecnico/analises', () => {
    expect(getDashboardRoute('TECHNICIAN')).toBe('/tecnico/analises')
  })

  it('OPERATOR é direcionado para /operador/turnos', () => {
    expect(getDashboardRoute('OPERATOR')).toBe('/operador/turnos')
  })

  it('role desconhecida cai no /login (fallback seguro)', () => {
    expect(getDashboardRoute('DESCONHECIDO')).toBe('/login')
  })
})

// ─── Cenário 12 — Login com perfil errado → mensagem clara ───────────────────
// Cobertura primária: auth.test.ts (isRouteAllowedForRole — 6 cenários).

describe('Cenário 12 — Acesso com perfil errado é bloqueado sem expor detalhes', () => {
  it('OPERATOR bloqueado em /gestor/usuarios', () => {
    expect(isRouteAllowedForRole('/gestor/usuarios', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN tem acesso a /operador/leituras (para monitoramento)', () => {
    expect(isRouteAllowedForRole('/operador/leituras', 'TECHNICIAN')).toBe(true)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 13 — Importação de dado inválido → banco não é corrompido ────────
// O Zod valida antes de qualquer escrita; dados inválidos nunca chegam ao banco.

describe('Cenário 13 — Dado inválido: validação impede corrupção do banco', () => {
  it('LeituraSchema rejeita value não-numérico (preprocess converte para NaN)', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               'não-é-um-número',
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema rejeita severity inválida — qualquer string arbitrária', () => {
    const r = OcorrenciaSchema.safeParse({
      description: 'Descrição com mais de 5 chars',
      severity:    'EXTREMO',
    })
    expect(r.success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload completamente vazio', () => {
    expect(EditHandoverSchema.safeParse({}).success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload com tipos errados', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         12345,   // deveria ser string
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})

