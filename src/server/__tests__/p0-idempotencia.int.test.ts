/** P0/P1: reenvio da fila offline e o cron de turnos não duplicam nada. */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form } from '@/test/auth-mock'
import { criarCenario } from '@/test/factories'
import { registrarLeitura } from '@/app/operador/leituras/actions'
import { GET as cronShifts } from '@/app/api/cron/shifts/route'

const agora = () => new Date().toISOString().slice(0, 16)

describe('leitura com client_id (fila offline)', () => {
  it('o mesmo client_id enviado 3 vezes grava uma leitura só', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const campos = { collection_point_id: A.ponto.id, recorded_at: agora(), client_id: 'abcd1234-ef56-7890' }
    const r1 = await registrarLeitura({}, form(campos))
    const r2 = await registrarLeitura({}, form(campos))
    const r3 = await registrarLeitura({}, form(campos))
    expect(r1.success).toBe(true); expect(r1.duplicate).toBeUndefined()
    expect(r2).toMatchObject({ success: true, duplicate: true })
    expect(r3).toMatchObject({ success: true, duplicate: true })
    expect(await prisma.reading.count()).toBe(1)
  })

  it('reenvios simultâneos: o banco garante uma só (índice único tenant_id + client_id)', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const campos = { collection_point_id: A.ponto.id, recorded_at: agora(), client_id: 'conc-1234-abcd-5678' }
    await Promise.allSettled(Array.from({ length: 5 }, () => registrarLeitura({}, form(campos))))
    expect(await prisma.reading.count()).toBe(1)
  })

  it('o mesmo client_id em plantas diferentes são leituras diferentes', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    const campos = { recorded_at: agora(), client_id: 'mesmo-id-12345678' }
    actAs(A.operador); await registrarLeitura({}, form({ ...campos, collection_point_id: A.ponto.id }))
    actAs(B.operador); await registrarLeitura({}, form({ ...campos, collection_point_id: B.ponto.id }))
    expect(await prisma.reading.count()).toBe(2)
  })

  it('client_id mal formado é recusado e nada é gravado', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const r = await registrarLeitura({}, form({ collection_point_id: A.ponto.id, recorded_at: agora(), client_id: 'x y' }))
    expect(r.fieldErrors?.client_id).toBeTruthy()
    expect(await prisma.reading.count()).toBe(0)
  })
})

describe('cron de turnos', () => {
  const chamar = () => cronShifts(new Request('http://localhost/api/cron/shifts', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  }))

  async function planta() {
    const A = await criarCenario('A')
    const shift = await prisma.shift.create({
      data: { tenant_id: A.tenant.id, name: 'Manhã', start_time: '06:00', end_time: '14:00' },
    })
    await prisma.shiftSchedule.create({
      data: { tenant_id: A.tenant.id, shift_id: shift.id, days_of_week: [0, 1, 2, 3, 4, 5, 6], is_active: true },
    })
    return { A, shift }
  }

  it('rodar duas vezes no mesmo dia cria as instâncias uma vez só', async () => {
    process.env.CRON_SECRET = 'segredo-de-teste'
    const { A } = await planta()
    const r1 = await chamar(); expect(r1.status).toBe(200)
    const aposPrimeira = await prisma.shiftInstance.count({ where: { tenant_id: A.tenant.id } })
    expect(aposPrimeira).toBe(1)
    const r2 = await chamar(); expect(r2.status).toBe(200)
    expect(await prisma.shiftInstance.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
  })

  it('duas execuções simultâneas também não duplicam', async () => {
    process.env.CRON_SECRET = 'segredo-de-teste'
    const { A } = await planta()
    await Promise.all([chamar(), chamar()])
    expect(await prisma.shiftInstance.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
  })

  it('sem o segredo: 401 e nada criado', async () => {
    process.env.CRON_SECRET = 'segredo-de-teste'
    const { A } = await planta()
    const r = await cronShifts(new Request('http://localhost/api/cron/shifts'))
    expect(r.status).toBe(401)
    expect(await prisma.shiftInstance.count({ where: { tenant_id: A.tenant.id } })).toBe(0)
  })

  it('cada planta recebe só as instâncias dos próprios agendamentos', async () => {
    process.env.CRON_SECRET = 'segredo-de-teste'
    const { A } = await planta()
    const B = await criarCenario('B') // planta sem agendamento
    await chamar()
    expect(await prisma.shiftInstance.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
    expect(await prisma.shiftInstance.count({ where: { tenant_id: B.tenant.id } })).toBe(0)
  })
})
