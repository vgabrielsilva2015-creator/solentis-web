/**
 * Tarefa (pós-M-06): ocorrências automáticas ALTA/CRÍTICA também alertam os gestores
 * por WhatsApp — reusando `sendWhatsAppAlert`, pós-commit, best-effort.
 *
 * Cobre: severidade (HIGH/CRITICAL enviam; LOW/MEDIUM não), destinatários (MANAGER do
 * tenant com telefone), falha de envio não derruba o fluxo, e não há duplicação
 * (um envio por gestor por ocorrência). O envio só ocorre quando o hook pós-commit é
 * invocado — nunca dentro da transação (ver m06-ocorrencia-automatica.test.ts).
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

function fakeTx() {
  return {
    $executeRaw: vi.fn(async () => 1),
    collectionPoint: { findFirst: vi.fn(async () => ({ id: 'p1', name: 'Saída Final' })) },
    qualityParameter: { findFirst: vi.fn(async () => ({ id: 'q1' })) }, // E3: parâmetro válido no tenant
    occurrenceSeverityDefault: { findUnique: vi.fn(async () => ({ deadline_hours: 24 })) },
    occurrence: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'occ1', ...data })), findFirst: vi.fn(async () => null) },
    occurrenceComment: { create: vi.fn() },
    auditLog: { create: vi.fn() }, // E2: criação automática audita
  }
}
const base = { tenantId: 'A', userId: 'u1', type: 'OPERATIONAL' as const, description: 'pH fora', collectionPointId: 'p1', parameterId: 'q1' }

beforeEach(() => {
  handleNewOccurrenceMock.mockReset().mockResolvedValue(vi.fn())
  sendWhatsAppMock.mockReset().mockResolvedValue(undefined)
  userFindMany.mockReset().mockResolvedValue([{ phone: '+5511999' }, { phone: '+5511888' }])
})

async function rodarHook(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') {
  const tx = fakeTx()
  // @ts-expect-error tx fake só com os métodos usados
  const hook = await criarOcorrenciaAutomatica(tx, { ...base, severity })
  await hook!()   // pós-commit
  return tx
}

describe('WhatsApp em ocorrência automática', () => {
  it('HIGH alerta cada gestor com telefone (tenant correto)', async () => {
    await rodarHook('HIGH')
    expect(userFindMany).toHaveBeenCalledOnce()
    expect(userFindMany.mock.calls[0][0].where).toMatchObject({ tenant_id: 'A', role: 'MANAGER', phone: { not: null } })
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(2)
    expect(sendWhatsAppMock.mock.calls[0][1]).toMatch(/ALTA/)
  })

  it('CRITICAL também alerta, com o rótulo correto', async () => {
    await rodarHook('CRITICAL')
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(2)
    expect(sendWhatsAppMock.mock.calls[0][1]).toMatch(/CRÍTICA/)
  })

  it('LOW e MEDIUM NÃO enviam WhatsApp', async () => {
    await rodarHook('LOW')
    await rodarHook('MEDIUM')
    expect(sendWhatsAppMock).not.toHaveBeenCalled()
  })

  it('sem gestor com telefone: não envia', async () => {
    userFindMany.mockResolvedValue([])
    await rodarHook('HIGH')
    expect(sendWhatsAppMock).not.toHaveBeenCalled()
  })

  it('falha de envio não propaga (ocorrência já persistida não é afetada)', async () => {
    sendWhatsAppMock.mockRejectedValue(new Error('provedor fora'))
    await expect(rodarHook('HIGH')).resolves.toBeTruthy()  // o hook resolve mesmo com falha de envio
  })

  it('não duplica: um envio por gestor por ocorrência', async () => {
    await rodarHook('HIGH')
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(2)   // 2 gestores, 1 envio cada
  })
})
