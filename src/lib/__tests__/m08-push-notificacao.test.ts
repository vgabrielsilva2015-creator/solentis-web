/**
 * M-08 — despacho de web-push da NC robusto e mensurável.
 *
 * O hook pós-commit de handleNewOccurrence: tenta TODOS os envios (Promise.allSettled),
 * remove subscription expirada (404/410), conta enviados/falhados/expirados num resumo
 * de log, e NUNCA lança (best-effort — não derruba a ocorrência já persistida).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendNotification = vi.fn()
const subDelete = vi.fn(async (_a: unknown) => ({}))
const userFindMany = vi.fn()
const loggerInfo = vi.fn()
const loggerError = vi.fn()

vi.mock('@/lib/web-push', () => ({ webpush: { sendNotification: (...a: unknown[]) => sendNotification(...a) } }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: (a: unknown) => userFindMany(a) }, pushSubscription: { delete: (a: unknown) => subDelete(a) } },
}))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ info: loggerInfo, error: loggerError, warn: vi.fn() }) }))
vi.mock('@/lib/error-utils', () => ({ errorStatusCode: (e: { status?: number }) => e?.status ?? 0 }))

import { handleNewOccurrence } from '@/lib/occurrences'

const tx = { shiftTask: { create: vi.fn(async () => ({ id: 't1' })) } }
const occ = { id: 'o1', tenant_id: 'A', description: 'NC pH', reported_by: 'u1' }
const sub = (endpoint: string) => ({ endpoint, p256dh: 'x', auth: 'y' })

beforeEach(() => {
  for (const m of [sendNotification, subDelete, userFindMany, loggerInfo, loggerError]) m.mockReset()
  subDelete.mockResolvedValue({})
})

describe('handleNewOccurrence — despacho de push (M-08)', () => {
  it('tenta todos, remove a expirada, conta enviados/falhados/expirados e não lança', async () => {
    userFindMany.mockResolvedValue([{ id: 'm1', push_subscriptions: [sub('A'), sub('B'), sub('C')] }])
    sendNotification.mockImplementation(async ({ endpoint }: { endpoint: string }) => {
      if (endpoint === 'B') throw { status: 410 }  // expirada → remove
      if (endpoint === 'C') throw { status: 500 }  // falha de provedor
      return undefined                              // A: ok
    })

    const hook = await handleNewOccurrence(tx as never, occ)
    await expect(hook()).resolves.toBeUndefined()

    expect(sendNotification).toHaveBeenCalledTimes(3)          // todos tentados (allSettled)
    expect(subDelete).toHaveBeenCalledTimes(1)
    expect(subDelete.mock.calls[0][0]).toMatchObject({ where: { endpoint: 'B' } })
    const resumo = loggerInfo.mock.calls.find((c) => c[1] === 'Push de NC concluído')
    expect(resumo?.[0]).toMatchObject({ enviados: 1, falhados: 1, expirados: 1, total: 3 })
  })

  it('escala além do limite de concorrência: ainda tenta todas', async () => {
    const subs = Array.from({ length: 23 }, (_, i) => sub(`e${i}`))
    userFindMany.mockResolvedValue([{ id: 'm1', push_subscriptions: subs }])
    sendNotification.mockResolvedValue(undefined)
    const hook = await handleNewOccurrence(tx as never, occ)
    await hook()
    expect(sendNotification).toHaveBeenCalledTimes(23)
    const resumo = loggerInfo.mock.calls.find((c) => c[1] === 'Push de NC concluído')
    expect(resumo?.[0]).toMatchObject({ enviados: 23, falhados: 0, expirados: 0, total: 23 })
  })

  it('sem subscriptions: não envia nem loga resumo, não lança', async () => {
    userFindMany.mockResolvedValue([{ id: 'm1', push_subscriptions: [] }])
    const hook = await handleNewOccurrence(tx as never, occ)
    await expect(hook()).resolves.toBeUndefined()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('erro ao buscar gestores: hook não lança (best-effort)', async () => {
    userFindMany.mockRejectedValue(new Error('db fora'))
    const hook = await handleNewOccurrence(tx as never, occ)
    await expect(hook()).resolves.toBeUndefined()
    expect(loggerError).toHaveBeenCalled()
  })
})
