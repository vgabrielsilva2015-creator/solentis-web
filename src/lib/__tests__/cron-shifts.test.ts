/**
 * T-22 — o cron de turnos faz um número CONSTANTE de consultas, qualquer que seja
 * a quantidade de plantas/turnos, e gera as mesmas instâncias de antes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls: string[] = []
const track = <T,>(name: string, impl: (a: never) => T) => (a: never) => { calls.push(name); return impl(a) }

type Sched = { shift_id: string; tenant_id: string; days_of_week: number[] }
let schedules: Sched[] = []
let existing: Array<{ shift_id: string; tenant_id: string }> = []
let scales: Array<{ shift_id: string; tenant_id: string; operator_id: string }> = []
let managers: Array<{ id: string; tenant_id: string }> = []
let created: Array<Record<string, unknown>> = []

vi.mock('@/lib/prisma', () => ({
  prisma: {
    shiftSchedule: { findMany: track('shiftSchedule.findMany', async () => schedules.map((s) => ({ ...s, shift: { is_active: true } }))) },
    shiftInstance: {
      findMany: track('shiftInstance.findMany', async () => existing),
      findFirst: track('shiftInstance.findFirst', async () => null),
      create: track('shiftInstance.create', async () => ({})),
      createMany: track('shiftInstance.createMany', async (a: { data: Array<Record<string, unknown>> }) => { created.push(...a.data); return { count: a.data.length } }),
    },
    shiftScale: {
      findMany: track('shiftScale.findMany', async () => scales),
      findFirst: track('shiftScale.findFirst', async () => null),
    },
    user: {
      findMany: track('user.findMany', async () => managers),
      findFirst: track('user.findFirst', async () => null),
    },
  },
}))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

const HOJE = new Date().getDay()
const req = () => new Request('http://x/api/cron/shifts', { headers: { authorization: 'Bearer segredo' } })

beforeEach(() => {
  calls.length = 0; created = []; schedules = []; existing = []; scales = []; managers = []
  process.env.CRON_SECRET = 'segredo'
  vi.stubEnv('NODE_ENV', 'production')
})

function montar(n: number) {
  for (let i = 0; i < n; i++) {
    schedules.push({ tenant_id: `T${i}`, shift_id: `S${i}a`, days_of_week: [HOJE] }, { tenant_id: `T${i}`, shift_id: `S${i}b`, days_of_week: [HOJE] })
    managers.push({ id: `M${i}`, tenant_id: `T${i}` })
  }
}

describe('cron de turnos', async () => {
  const { GET } = await import('@/app/api/cron/shifts/route')

  it('número de consultas não cresce com o número de plantas', async () => {
    montar(2); await GET(req()); const pequeno = calls.length
    calls.length = 0; created = []; schedules = []; managers = []
    montar(40); await GET(req()); const grande = calls.length
    expect(grande).toBe(pequeno)
    expect(grande).toBeLessThanOrEqual(6)
  })

  it('cria uma instância SCHEDULED por turno, com o operador escalado ou, sem escala, o gestor da planta', async () => {
    montar(2)
    scales = [{ tenant_id: 'T0', shift_id: 'S0a', operator_id: 'OP-escalado' }]
    const r = await (await GET(req())).json()
    expect(r).toMatchObject({ success: true, processed: 4, created: 4, skipped: 0 })
    const por = Object.fromEntries(created.map((c) => [`${c.tenant_id}/${c.shift_id}`, c.opened_by]))
    expect(por['T0/S0a']).toBe('OP-escalado')
    expect(por['T0/S0b']).toBe('M0')
    expect(por['T1/S1a']).toBe('M1')
    expect(created.every((c) => c.status === 'SCHEDULED')).toBe(true)
  })

  it('não recria turno que já existe hoje e pula (conta) quem não tem operador nem gestor', async () => {
    montar(2)
    existing = [{ tenant_id: 'T0', shift_id: 'S0a' }]
    managers = managers.filter((m) => m.tenant_id !== 'T1')
    const r = await (await GET(req())).json()
    expect(created.map((c) => `${c.tenant_id}/${c.shift_id}`).sort()).toEqual(['T0/S0b'])
    expect(r).toMatchObject({ processed: 4, created: 1, skipped: 2 })
  })

  it('ignora agendamento de outro dia da semana', async () => {
    montar(1)
    schedules[0].days_of_week = [(HOJE + 3) % 7]
    await GET(req())
    expect(created.map((c) => c.shift_id)).toEqual(['S0b'])
  })

  it('se o lote falha, refaz item a item e uma planta com problema não impede as outras', async () => {
    montar(2)
    const { prisma } = await import('@/lib/prisma')
    const mock = prisma.shiftInstance as unknown as { createMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    const antigoMany = mock.createMany, antigoCreate = mock.create
    mock.createMany = vi.fn(async () => { throw new Error('FK') })
    let n = 0
    mock.create = vi.fn(async () => { if (n++ === 1) throw new Error('FK do operador'); return {} })
    try {
      const r = await (await GET(req())).json()
      expect(mock.create).toHaveBeenCalledTimes(4)
      expect(r).toMatchObject({ created: 3, skipped: 1 })
    } finally { mock.createMany = antigoMany; mock.create = antigoCreate }
  })

  it('sem o segredo, em produção, responde 401 e não consulta nada', async () => {
    const r = await GET(new Request('http://x', { headers: { authorization: 'Bearer errado' } }))
    expect(r.status).toBe(401)
    expect(calls).toEqual([])
  })
})
