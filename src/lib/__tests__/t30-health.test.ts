import { describe, it, expect, vi, beforeEach } from 'vitest'

const consulta = vi.fn()
const erroLog = vi.fn()
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: (...a: unknown[]) => consulta(...a) } }))
vi.mock('@/lib/logger', () => ({ logger: { error: (...a: unknown[]) => erroLog(...a) } }))

import { GET } from '@/app/api/health/route'

beforeEach(() => { consulta.mockReset(); erroLog.mockReset() })

describe('T-30 /api/health', () => {
  it('banco responde → 200 {status:"ok"}, sem cache, sem outros campos', async () => {
    consulta.mockResolvedValue([{ '?column?': 1 }])
    const r = await GET()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(await r.json()).toEqual({ status: 'ok' })
  })

  it('banco falha → 503 {status:"falha"}; o detalhe vai só para o log, nunca para a resposta', async () => {
    consulta.mockRejectedValue(new Error('password authentication failed for user "postgres" at db.interno:5432'))
    const r = await GET()
    expect(r.status).toBe(503)
    const corpo = await r.json()
    expect(corpo).toEqual({ status: 'falha' })
    expect(JSON.stringify(corpo)).not.toMatch(/postgres|5432|password/)
    expect(erroLog).toHaveBeenCalledTimes(1)
  })

  it('banco pendurado → 503 em ~3 s (não segura o monitor)', async () => {
    vi.useFakeTimers()
    try {
      consulta.mockReturnValue(new Promise(() => {}))
      const p = GET()
      await vi.advanceTimersByTimeAsync(3100)
      const r = await p
      expect(r.status).toBe(503)
    } finally { vi.useRealTimers() }
  })
})
