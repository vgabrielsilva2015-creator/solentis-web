/**
 * M-01 — Separação de funções na aprovação de análise.
 *
 * Regras:
 *  - Quem registrou a análise NÃO pode aprová-la (separação de funções).
 *  - Exceção: o gestor (MANAGER) pode aprovar qualquer análise, inclusive a que
 *    registrou (planta com um único técnico).
 *  - A gravação é condicionada a `approved_by: null` (sem dupla aprovação numa corrida).
 *  - Toda aprovação é auditada (logAudit).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const analysisFind = vi.fn()
const analysisUpdateMany = vi.fn()
const audit = vi.fn()
const ctx = { userId: 'u1', tenantId: 'A', role: 'TECHNICIAN' as string, email: 't@a', name: 'Tec' }

vi.mock('@/server/auth/guards', () => ({
  requirePermission: async () => ctx,
  permissionError: () => null,
}))
vi.mock('@/lib/tenant', () => ({ getTenantId: async () => 'A' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: (...a: unknown[]) => audit(...a) }))
vi.mock('@/lib/occurrences', () => ({ handleNewOccurrence: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: {
      findFirst: (a: unknown) => analysisFind(a),
      updateMany: (a: unknown) => analysisUpdateMany(a),
    },
  },
}))

beforeEach(() => {
  analysisFind.mockReset(); analysisUpdateMany.mockReset(); audit.mockReset()
  analysisUpdateMany.mockResolvedValue({ count: 1 })
  ctx.userId = 'u1'; ctx.role = 'TECHNICIAN'
})

describe('aprovarAnalise — separação de funções (M-01)', async () => {
  const { aprovarAnalise } = await import('@/app/tecnico/analises/actions')

  it('técnico que registrou NÃO aprova a própria análise', async () => {
    analysisFind.mockResolvedValue({ approved_by: null, recorded_by: 'u1' })
    const r = await aprovarAnalise('a1')
    expect(r.error).toMatch(/não pode aprovar/i)
    expect(analysisUpdateMany).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it('técnico aprova análise de OUTRA pessoa (grava condicionado a approved_by null e audita)', async () => {
    analysisFind.mockResolvedValue({ approved_by: null, recorded_by: 'u2' })
    const r = await aprovarAnalise('a1')
    expect(r).toEqual({})
    const where = analysisUpdateMany.mock.calls[0][0].where
    expect(where).toMatchObject({ id: 'a1', tenant_id: 'A', approved_by: null })
    expect(audit).toHaveBeenCalledOnce()
  })

  it('GESTOR pode aprovar a própria análise (planta de 1 técnico)', async () => {
    ctx.userId = 'g1'; ctx.role = 'MANAGER'
    analysisFind.mockResolvedValue({ approved_by: null, recorded_by: 'g1' })
    const r = await aprovarAnalise('a1')
    expect(r).toEqual({})
    expect(analysisUpdateMany).toHaveBeenCalledOnce()
    expect(audit).toHaveBeenCalledOnce()
  })

  it('corrida: se o update não afeta nenhuma linha (count 0) → já aprovada e NÃO audita', async () => {
    analysisFind.mockResolvedValue({ approved_by: null, recorded_by: 'u2' })
    analysisUpdateMany.mockResolvedValue({ count: 0 })
    const r = await aprovarAnalise('a1')
    expect(r.error).toMatch(/já aprovada/i)
    expect(audit).not.toHaveBeenCalled()
  })

  it('análise já aprovada no pré-check não é tocada', async () => {
    analysisFind.mockResolvedValue({ approved_by: 'uX', recorded_by: 'u2' })
    const r = await aprovarAnalise('a1')
    expect(r.error).toMatch(/já aprovada/i)
    expect(analysisUpdateMany).not.toHaveBeenCalled()
  })

  it('análise inexistente devolve erro claro', async () => {
    analysisFind.mockResolvedValue(null)
    const r = await aprovarAnalise('a1')
    expect(r.error).toMatch(/não encontrada/i)
    expect(analysisUpdateMany).not.toHaveBeenCalled()
  })
})
