/**
 * M-10 — o cron de turnos é idempotente: rodar 2× no mesmo dia não duplica a instância
 * (garantido pelo check `jaExiste` + `skipDuplicates`). Banco real (T-28).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { criarPlanta, criarUsuario } from '@/test/factories'
import { GET } from '@/app/api/cron/shifts/route'

const SECRET = 'cron-secret-teste'
const req = () => new Request('http://localhost/api/cron/shifts', { headers: { authorization: `Bearer ${SECRET}` } })

beforeEach(() => { process.env.CRON_SECRET = SECRET })

async function cenarioComAgendamentoHoje() {
  const t = await criarPlanta()
  const gestor = await criarUsuario(t.id, 'MANAGER')
  const shift = await prisma.shift.create({
    data: { tenant_id: t.id, name: 'Manhã', start_time: '06:00', end_time: '14:00', crosses_midnight: false, handover_timeout_minutes: 60, is_active: true },
  })
  await prisma.shiftSchedule.create({
    data: { tenant_id: t.id, shift_id: shift.id, days_of_week: [new Date().getDay()], is_active: true },
  })
  return { t, gestor, shift }
}

describe('cron de turnos — idempotência (M-10)', () => {
  it('rodar 2× cria a instância do dia uma única vez', async () => {
    const { t } = await cenarioComAgendamentoHoje()

    const j1 = await (await GET(req())).json()
    const j2 = await (await GET(req())).json()

    expect(j1.created).toBe(1)   // 1ª execução cria
    expect(j2.created).toBe(0)   // 2ª execução não recria
    expect(await prisma.shiftInstance.count({ where: { tenant_id: t.id } })).toBe(1)
  })

  it('sem operador escalado nem gestor: pula a instância (skipped), não quebra', async () => {
    const t = await criarPlanta()   // sem gestor
    const shift = await prisma.shift.create({
      data: { tenant_id: t.id, name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true, handover_timeout_minutes: 60, is_active: true },
    })
    await prisma.shiftSchedule.create({
      data: { tenant_id: t.id, shift_id: shift.id, days_of_week: [new Date().getDay()], is_active: true },
    })
    const j = await (await GET(req())).json()
    expect(j.created).toBe(0)
    expect(j.skipped).toBeGreaterThanOrEqual(1)
    expect(await prisma.shiftInstance.count({ where: { tenant_id: t.id } })).toBe(0)
  })

  it('rejeita sem o CRON_SECRET correto', async () => {
    const r = await GET(new Request('http://localhost/api/cron/shifts', { headers: { authorization: 'Bearer errado' } }))
    expect(r.status).toBe(401)
  })
})
