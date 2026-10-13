/**
 * M-05 — Encerrar turno à força (gestor).
 *
 * Regras:
 *  - justificativa obrigatória (mín. 10 chars);
 *  - só encerra turno OPEN ou HANDOVER_PENDING (CLOSED/SCHEDULED recusados);
 *  - fecha a instância condicionado ao estado lido (corrida não encerra 2×);
 *  - passagem ainda aguardando → FORCE_CLOSED (sai do alerta, não pode ser confirmada);
 *  - audita com a justificativa.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const instFind = vi.fn()
const instUpdate = vi.fn()
const hoUpdate = vi.fn()
const audit = vi.fn()
const ctx = { userId: 'g1', tenantId: 'A', role: 'MANAGER' as string, email: 'g@a', name: 'Gestor' }

vi.mock('@/server/auth/guards', () => ({
  requirePermission: async () => ctx,
  permissionError: () => null,
}))
vi.mock('@/lib/tenant', () => ({ getTenantId: async () => 'A' }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: (...a: unknown[]) => audit(...a) }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    shiftInstance: { updateMany: (a: unknown) => instUpdate(a) },
    shiftHandover: { updateMany: (a: unknown) => hoUpdate(a) },
  }
  return {
    prisma: {
      shiftInstance: { findFirst: (a: unknown) => instFind(a) },
      $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  }
})

const fd = (justification: string) => {
  const f = new FormData()
  f.set('justification', justification)
  return f
}
const JUST = 'Operador saiu sem passar o turno; encerrando.'

beforeEach(() => {
  for (const m of [instFind, instUpdate, hoUpdate, audit]) m.mockReset()
  instUpdate.mockResolvedValue({ count: 1 })
})

describe('encerrarTurnoForcado (M-05)', async () => {
  const { encerrarTurnoForcado } = await import('@/app/gestor/turnos/tarefas/actions')

  it('justificativa curta é recusada sem gravar', async () => {
    instFind.mockResolvedValue({ status: 'OPEN', handover: null })
    const r = await encerrarTurnoForcado('i1', {}, fd('curta'))
    expect(r.fieldErrors?.justification).toBeTruthy()
    expect(instUpdate).not.toHaveBeenCalled()
  })

  it('turno inexistente devolve erro', async () => {
    instFind.mockResolvedValue(null)
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.error).toMatch(/não encontrado/i)
  })

  it('turno já CLOSED é recusado', async () => {
    instFind.mockResolvedValue({ status: 'CLOSED', handover: null })
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.error).toMatch(/já está encerrado/i)
    expect(instUpdate).not.toHaveBeenCalled()
  })

  it('turno SCHEDULED não pode ser encerrado à força', async () => {
    instFind.mockResolvedValue({ status: 'SCHEDULED', handover: null })
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.error).toMatch(/aberto ou aguardando/i)
    expect(instUpdate).not.toHaveBeenCalled()
  })

  it('OPEN sem passagem: fecha e audita com a justificativa; não toca handover', async () => {
    instFind.mockResolvedValue({ status: 'OPEN', handover: null })
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.success).toBe(true)
    expect(instUpdate.mock.calls[0][0].where).toMatchObject({ id: 'i1', tenant_id: 'A' })
    expect(hoUpdate).not.toHaveBeenCalled()
    expect(audit).toHaveBeenCalledOnce()
    expect(audit.mock.calls[0][1]).toMatchObject({ justification: JUST, action: 'UPDATE', tableName: 'shift_instances' })
  })

  it('HANDOVER_PENDING com passagem aguardando: passagem vira FORCE_CLOSED', async () => {
    instFind.mockResolvedValue({ status: 'HANDOVER_PENDING', handover: { id: 'h1', status: 'PENDING' } })
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.success).toBe(true)
    expect(hoUpdate.mock.calls[0][0].data).toMatchObject({ status: 'FORCE_CLOSED' })
    expect(audit).toHaveBeenCalledOnce()
  })

  it('corrida: update não afeta linha (count 0) → erro, sem auditar', async () => {
    instFind.mockResolvedValue({ status: 'OPEN', handover: null })
    instUpdate.mockResolvedValue({ count: 0 })
    const r = await encerrarTurnoForcado('i1', {}, fd(JUST))
    expect(r.error).toMatch(/estado.*mudou|recarregue/i)
    expect(audit).not.toHaveBeenCalled()
  })
})
