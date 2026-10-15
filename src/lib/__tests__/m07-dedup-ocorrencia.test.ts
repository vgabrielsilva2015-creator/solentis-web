/**
 * M-07 — deduplicação de reincidências (unit, com tx mockado).
 *
 * Quando já existe ocorrência NÃO resolvida do mesmo (tenant, ponto, parâmetro):
 *  - registra comentário de reincidência; NÃO cria nova ocorrência/tarefa/notificação;
 *  - se a nova detecção for mais grave, escala a severidade e devolve hook de alerta.
 * O advisory lock é adquirido antes da busca (serialização anti-corrida).
 * Os cenários de banco real (persistência, resolvida→nova, concorrência) estão no
 * teste de integração p0-ocorrencia-dedup.int.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const handleNewOccurrenceMock = vi.fn()
const sendWhatsAppMock = vi.fn()
const userFindMany = vi.fn()

vi.mock('@/lib/occurrences', () => ({ handleNewOccurrence: () => handleNewOccurrenceMock() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppAlert: (...a: unknown[]) => sendWhatsAppMock(...a) }))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }) }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findMany: (a: unknown) => userFindMany(a) } } }))

import { criarOcorrenciaAutomatica } from '@/server/occurrences/criar'

function fakeTx(aberta: { id: string; severity: string } | null) {
  const commentCreate = vi.fn(async (_a: { data: Record<string, unknown> }) => ({ id: 'c1' }))
  const occCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'nova', ...data }))
  const occUpdate = vi.fn(async (_a: { where: unknown; data: unknown }) => ({ count: 1 }))
  const executeRaw = vi.fn(async () => 1)
  const tx = {
    $executeRaw: executeRaw,
    collectionPoint: { findFirst: vi.fn(async () => ({ id: 'p1', name: 'Saída' })) },
    qualityParameter: { findFirst: vi.fn(async () => ({ id: 'q1' })) }, // E3: parâmetro válido no tenant
    occurrenceSeverityDefault: { findUnique: vi.fn(async () => ({ deadline_hours: 24 })) },
    occurrence: { findFirst: vi.fn(async () => aberta), create: occCreate, updateMany: occUpdate },
    occurrenceComment: { create: commentCreate },
    auditLog: { create: vi.fn() }, // E2: reincidência/escalonamento auditam
  }
  return { tx, commentCreate, occCreate, occUpdate, executeRaw }
}
const base = { tenantId: 'A', userId: 'u1', type: 'OPERATIONAL' as const, severity: 'HIGH' as const, description: 'pH 11', collectionPointId: 'p1', parameterId: 'q1' }

beforeEach(() => {
  handleNewOccurrenceMock.mockReset().mockResolvedValue(vi.fn())
  sendWhatsAppMock.mockReset().mockResolvedValue(undefined)
  userFindMany.mockReset().mockResolvedValue([{ phone: '+55' }])
})

describe('deduplicação de ocorrência automática (M-07)', () => {
  it('sem reincidência aberta: cria a ocorrência (e adquire o advisory lock antes de buscar)', async () => {
    const { tx, occCreate, commentCreate, executeRaw } = fakeTx(null)
    // @ts-expect-error tx fake
    const hook = await criarOcorrenciaAutomatica(tx, base)
    expect(executeRaw).toHaveBeenCalledOnce()         // advisory lock
    expect(occCreate).toHaveBeenCalledOnce()
    expect(occCreate.mock.calls[0][0].data).toMatchObject({ parameter_id: 'q1', collection_point_id: 'p1' })
    expect(commentCreate).not.toHaveBeenCalled()
    expect(typeof hook).toBe('function')
  })

  it('reincidência (mesma severidade): comenta, NÃO cria ocorrência, sem notificação', async () => {
    const { tx, occCreate, commentCreate } = fakeTx({ id: 'ab1', severity: 'HIGH' })
    // @ts-expect-error tx fake
    const hook = await criarOcorrenciaAutomatica(tx, base)
    expect(commentCreate).toHaveBeenCalledOnce()
    expect(commentCreate.mock.calls[0][0].data).toMatchObject({ occurrence_id: 'ab1', user_id: 'u1' })
    expect(occCreate).not.toHaveBeenCalled()
    expect(handleNewOccurrenceMock).not.toHaveBeenCalled()   // sem tarefa-plano
    expect(hook).toBeNull()                                  // sem notificação normal
  })

  it('reincidência mais grave: escala a severidade e devolve alerta prioritário (WhatsApp)', async () => {
    const { tx, occCreate, occUpdate, commentCreate } = fakeTx({ id: 'ab1', severity: 'HIGH' })
    // @ts-expect-error tx fake
    const hook = await criarOcorrenciaAutomatica(tx, { ...base, severity: 'CRITICAL' })
    expect(commentCreate).toHaveBeenCalledOnce()
    expect(occUpdate).toHaveBeenCalledOnce()
    expect(occUpdate.mock.calls[0][0]).toMatchObject({ where: { id: 'ab1', tenant_id: 'A' }, data: { severity: 'CRITICAL' } })
    expect(occCreate).not.toHaveBeenCalled()
    expect(typeof hook).toBe('function')
    await hook!()
    expect(sendWhatsAppMock).toHaveBeenCalled()              // alerta prioritário
  })
})
