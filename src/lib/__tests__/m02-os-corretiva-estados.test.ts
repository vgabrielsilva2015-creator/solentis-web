/**
 * M-02 — Máquina de estados da OS corretiva.
 *
 * Regras:
 *  - Só transições previstas: OPEN→{IN_PROGRESS,CANCELLED}, IN_PROGRESS→{COMPLETED,CANCELLED},
 *    COMPLETED→{VALIDATED,IN_PROGRESS} (reabrir), VALIDATED e CANCELLED terminais.
 *  - Transição condicionada ao estado lido (corrida não duplica log nem auditoria).
 *  - Toda transição audita (logAudit).
 *  - VALIDATED cria o MaintenanceLog uma única vez.
 *  - Separação de funções (D2): o responsável pela OS não a valida, exceto se for
 *    o único gestor da planta.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const corretivaFind = vi.fn()
const updateMany = vi.fn()
const logCreate = vi.fn()
const userFind = vi.fn()
const userCount = vi.fn()
const audit = vi.fn()
const ctx = { userId: 'u1', tenantId: 'A', role: 'MANAGER' as string, email: 'g@a', name: 'Gestor' }

vi.mock('@/server/auth/guards', () => ({
  requirePermission: async () => ctx,
  permissionError: () => null, // perfil sempre autorizado; o foco do teste é a máquina de estados / separação
}))
vi.mock('@/lib/tenant', () => ({ getTenantId: async () => 'A' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: (...a: unknown[]) => audit(...a) }))
vi.mock('@/lib/storage', () => ({ saveUpload: vi.fn(), saveImageUpload: vi.fn() }))
vi.mock('@/lib/ownership', () => ({ checkOwnership: vi.fn() }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    correctiveMaintenance: { updateMany: (a: unknown) => updateMany(a) },
    maintenanceLog: { create: (a: unknown) => logCreate(a) },
    user: { findFirst: (a: unknown) => userFind(a) },
  }
  return {
    prisma: {
      correctiveMaintenance: { findFirst: (a: unknown) => corretivaFind(a) },
      user: { count: (a: unknown) => userCount(a) },
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  }
})

beforeEach(() => {
  for (const m of [corretivaFind, updateMany, logCreate, userFind, userCount, audit]) m.mockReset()
  updateMany.mockResolvedValue({ count: 1 })
  userFind.mockResolvedValue({ name: 'Responsável' })
  userCount.mockResolvedValue(1)
  ctx.userId = 'u1'; ctx.role = 'MANAGER'
})

const corretiva = (o: Record<string, unknown> = {}) => ({
  status: 'IN_PROGRESS', equipment_id: 'e1', description: 'Bomba', estimated_cost: null, responsible_id: 'r1', ...o,
})

describe('atualizarStatusCorretiva — máquina de estados (M-02)', async () => {
  const { atualizarStatusCorretiva } = await import('@/app/tecnico/equipamentos/actions')

  it.each([
    ['VALIDATED', 'OPEN'],
    ['VALIDATED', 'IN_PROGRESS'],
    ['CANCELLED', 'IN_PROGRESS'],
    ['OPEN', 'COMPLETED'],
    ['OPEN', 'VALIDATED'],
    ['COMPLETED', 'OPEN'],
  ])('recusa transição inválida %s → %s sem gravar', async (de, para) => {
    corretivaFind.mockResolvedValue(corretiva({ status: de }))
    const r = await atualizarStatusCorretiva('c1', para as never)
    expect(r.error).toMatch(/não é possível mudar/i)
    expect(updateMany).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it.each([
    ['OPEN', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'COMPLETED'],
    ['IN_PROGRESS', 'CANCELLED'],
    ['COMPLETED', 'IN_PROGRESS'], // D1: reabrir
  ])('aceita transição válida %s → %s e audita', async (de, para) => {
    corretivaFind.mockResolvedValue(corretiva({ status: de }))
    const r = await atualizarStatusCorretiva('c1', para as never)
    expect(r).toEqual({})
    expect(updateMany.mock.calls[0][0].where).toMatchObject({ id: 'c1', tenant_id: 'A', status: de })
    expect(audit).toHaveBeenCalledOnce()
  })

  it('mesmo status é no-op idempotente (não grava, não audita, não cria log)', async () => {
    corretivaFind.mockResolvedValue(corretiva({ status: 'VALIDATED' }))
    const r = await atualizarStatusCorretiva('c1', 'VALIDATED')
    expect(r).toEqual({})
    expect(updateMany).not.toHaveBeenCalled()
    expect(logCreate).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it('COMPLETED → VALIDATED cria o MaintenanceLog uma vez e audita', async () => {
    corretivaFind.mockResolvedValue(corretiva({ status: 'COMPLETED', responsible_id: 'r1' }))
    const r = await atualizarStatusCorretiva('c1', 'VALIDATED')
    expect(r).toEqual({})
    expect(logCreate).toHaveBeenCalledOnce()
    expect(audit).toHaveBeenCalledOnce()
  })

  it('corrida: update não afeta linha (count 0) → erro de estado mudado, sem log nem auditoria', async () => {
    corretivaFind.mockResolvedValue(corretiva({ status: 'COMPLETED' }))
    updateMany.mockResolvedValue({ count: 0 })
    const r = await atualizarStatusCorretiva('c1', 'VALIDATED')
    expect(r.error).toMatch(/estado.*mudou|recarregue/i)
    expect(logCreate).not.toHaveBeenCalled()
    expect(audit).not.toHaveBeenCalled()
  })

  it('D2: responsável NÃO valida a própria OS quando há mais de um gestor', async () => {
    ctx.userId = 'r1'
    corretivaFind.mockResolvedValue(corretiva({ status: 'COMPLETED', responsible_id: 'r1' }))
    userCount.mockResolvedValue(2)
    const r = await atualizarStatusCorretiva('c1', 'VALIDATED')
    expect(r.error).toMatch(/responsável.*outro gestor/i)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('D2: gestor único da planta PODE validar a própria OS', async () => {
    ctx.userId = 'r1'
    corretivaFind.mockResolvedValue(corretiva({ status: 'COMPLETED', responsible_id: 'r1' }))
    userCount.mockResolvedValue(1)
    const r = await atualizarStatusCorretiva('c1', 'VALIDATED')
    expect(r).toEqual({})
    expect(logCreate).toHaveBeenCalledOnce()
  })

  it('corretiva inexistente devolve erro', async () => {
    corretivaFind.mockResolvedValue(null)
    const r = await atualizarStatusCorretiva('c1', 'COMPLETED')
    expect(r.error).toMatch(/não encontrada/i)
  })
})
