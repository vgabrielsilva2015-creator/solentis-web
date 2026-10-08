/**
 * T-21 (B-09 / achado "status sem validação"): entradas que não passam por Zod
 * também respeitam tamanho máximo, e o status da corretiva só aceita valores válidos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const corretivaFind = vi.fn()
const corretivaUpdate = vi.fn()
const occFind = vi.fn()
const commentCreate = vi.fn()
const ctx = { userId: 'u1', tenantId: 'A', role: 'TECHNICIAN' as const, email: 't@a', name: 'Tec' }

vi.mock('@/server/auth/guards', () => ({
  requirePermission: async () => ctx,
  permissionError: () => null,
}))
vi.mock('@/lib/tenant', () => ({ getTenantId: async () => 'A' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/storage', () => ({ saveUpload: vi.fn(), saveImageUpload: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppAlert: vi.fn() }))
vi.mock('@/lib/occurrences', () => ({ handleNewOccurrence: vi.fn() }))
vi.mock('@/lib/ownership', () => ({ checkOwnership: vi.fn(), assertOwned: vi.fn() }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    correctiveMaintenance: { updateMany: (a: unknown) => corretivaUpdate(a) },
    maintenanceLog: { create: vi.fn() },
    user: { findFirst: vi.fn() },
  }
  return {
    prisma: {
      correctiveMaintenance: { findFirst: (a: unknown) => corretivaFind(a) },
      occurrence: { findFirst: (a: unknown) => occFind(a) },
      occurrenceComment: { create: (a: unknown) => commentCreate(a) },
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  }
})

beforeEach(() => {
  for (const m of [corretivaFind, corretivaUpdate, occFind, commentCreate]) m.mockReset()
  corretivaFind.mockResolvedValue({ status: 'OPEN', equipment_id: 'e1', description: 'x', estimated_cost: null, responsible_id: 'u1' })
  occFind.mockResolvedValue({ id: 'o1' })
})

describe('atualizarStatusCorretiva', async () => {
  const { atualizarStatusCorretiva } = await import('@/app/tecnico/equipamentos/actions')

  it.each(['FOO', '', 'completed', 'DELETED'])('status inválido (%j) é recusado sem gravar', async (s) => {
    const r = await atualizarStatusCorretiva('c1', s as never)
    expect(r.error).toMatch(/status inválido/i)
    expect(corretivaUpdate).not.toHaveBeenCalled()
  })

  it('nota gigante é recusada sem gravar', async () => {
    const r = await atualizarStatusCorretiva('c1', 'COMPLETED', { notes: 'x'.repeat(2001) })
    expect(r.error).toMatch(/muito longa|máximo/i)
    expect(corretivaUpdate).not.toHaveBeenCalled()
  })

  it('status e nota válidos continuam gravando', async () => {
    const r = await atualizarStatusCorretiva('c1', 'COMPLETED', { notes: 'x'.repeat(2000) })
    expect(r).toEqual({})
    expect(corretivaUpdate).toHaveBeenCalledOnce()
  })
})

describe('addOccurrenceComment', async () => {
  const { addOccurrenceComment } = await import('@/app/operador/ocorrencias/actions')

  it('comentário de 200 KB é recusado', async () => {
    await expect(addOccurrenceComment('o1', 'x'.repeat(200_000))).rejects.toThrow(/máximo|muito longo/i)
    expect(commentCreate).not.toHaveBeenCalled()
  })
  it('comentário normal grava', async () => {
    await addOccurrenceComment('o1', 'Verificado no local, sem vazamento.')
    expect(commentCreate).toHaveBeenCalledOnce()
  })
})
