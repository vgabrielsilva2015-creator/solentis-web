/**
 * T-25 — contrato de estoque e leituras no banco real. Escritos contra o código ANTES da
 * extração para `src/server/<módulo>/service.ts` e mantidos iguais depois: se passam nos dois,
 * a extração não mudou comportamento. Só a sessão é simulada.
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form } from '@/test/auth-mock'
import { criarCenario, criarEntrada } from '@/test/factories'
import { registrarSaida, registrarContagem } from '@/app/operador/estoque/actions'
import { registrarEntrada } from '@/app/gestor/produtos-quimicos/actions'
import { registrarLeitura } from '@/app/operador/leituras/actions'

const agora = () => new Date().toISOString().slice(0, 16)

async function saldo(tenant_id: string, product_id: string) {
  const [e, s] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({ where: { tenant_id, product_id }, _sum: { quantity: true } }),
    prisma.chemicalStockExit.aggregate({ where: { tenant_id, product_id }, _sum: { quantity: true } }),
  ])
  return (e._sum.quantity ?? 0) - (s._sum.quantity ?? 0)
}

describe('contagem física = ajuste de inventário', () => {
  it('contou mais que o saldo: entrada de ajuste da diferença; saldo passa a ser o contado', async () => {
    const A = await criarCenario('A'); await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    actAs(A.operador)
    const r = await registrarContagem(null, form({ product_id: A.produto.id, counted_quantity: '14', counted_at: agora() }))
    expect(r).toEqual({ success: true })
    const ajustes = await prisma.chemicalStockEntry.findMany({ where: { notes: 'Ajuste por contagem física' } })
    expect(ajustes).toHaveLength(1)
    expect(ajustes[0]).toMatchObject({ quantity: 4, tenant_id: A.tenant.id, recorded_by: A.operador.id })
    expect(await prisma.chemicalStockCount.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
    expect(await saldo(A.tenant.id, A.produto.id)).toBe(14)
  })

  it('contou menos: saída de ajuste; contou igual: nenhum ajuste, mas a contagem fica registrada', async () => {
    const A = await criarCenario('A'); await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    actAs(A.operador)
    await registrarContagem(null, form({ product_id: A.produto.id, counted_quantity: '3,5', counted_at: agora() }))
    const saidas = await prisma.chemicalStockExit.findMany({ where: { notes: 'Ajuste por contagem física' } })
    expect(saidas).toHaveLength(1)
    expect(saidas[0].quantity).toBeCloseTo(6.5)
    expect(await saldo(A.tenant.id, A.produto.id)).toBeCloseTo(3.5)

    await registrarContagem(null, form({ product_id: A.produto.id, counted_quantity: '3,5', counted_at: agora() }))
    expect(await prisma.chemicalStockExit.count({ where: { notes: 'Ajuste por contagem física' } })).toBe(1)
    expect(await prisma.chemicalStockEntry.count({ where: { notes: 'Ajuste por contagem física' } })).toBe(0)
    expect(await prisma.chemicalStockCount.count({ where: { tenant_id: A.tenant.id } })).toBe(2)
  })
})

describe('saída e entrada', () => {
  it('saída acima do saldo é recusada com a mensagem de sempre e nada é gravado', async () => {
    const A = await criarCenario('A'); await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 5)
    actAs(A.operador)
    const r = await registrarSaida(null, form({ product_id: A.produto.id, quantity: '6', used_at: agora() }))
    expect(r).toEqual({ error: 'Atenção: saída de 6 resulta em estoque negativo (saldo atual é 5.00). Operação bloqueada.' })
    expect(await prisma.chemicalStockExit.count()).toBe(0)
  })

  it('entrada do gestor grava fornecedor, nota e quem registrou; produto de outra planta é recusado', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    actAs(A.gestor)
    expect(await registrarEntrada(null, form({
      product_id: A.produto.id, quantity: '12,5', supplier: 'Fornecedor X', invoice_number: 'NF-1', received_at: agora(),
    }))).toEqual({ success: true })
    const e = await prisma.chemicalStockEntry.findFirstOrThrow({ where: { product_id: A.produto.id } })
    expect(e).toMatchObject({ quantity: 12.5, supplier: 'Fornecedor X', invoice_number: 'NF-1', recorded_by: A.gestor.id, tenant_id: A.tenant.id })

    const r = await registrarEntrada(null, form({ product_id: B.produto.id, quantity: '1', received_at: agora() }))
    expect(r).toMatchObject({ error: expect.stringMatching(/inválido ou não autorizado/i) })
    expect(await prisma.chemicalStockEntry.count({ where: { product_id: B.produto.id } })).toBe(0)
  })
})

async function parametro(tenant_id: string, created_by: string, over: { min?: number | null; max?: number | null; unit?: string } = {}) {
  return prisma.qualityParameter.create({
    data: {
      tenant_id, created_by, name: 'pH', unit: over.unit ?? 'pH',
      min_limit: over.min === undefined ? 6 : over.min, max_limit: over.max === undefined ? 9 : over.max,
      effective_date: new Date(),
    },
  })
}

describe('leitura de campo', () => {
  it('fora da faixa: marca não conforme, abre ocorrência HIGH no ponto e a tarefa de tratamento', async () => {
    const A = await criarCenario('A'); const p = await parametro(A.tenant.id, A.gestor.id)
    actAs(A.operador)
    const antes = Date.now()
    const r = await registrarLeitura(null as never, form({
      collection_point_id: A.ponto.id, parameter_id: p.id, value: '11,2', recorded_at: agora(),
    }))
    expect(r).toEqual({ success: true, warning: undefined })
    const lei = await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })
    expect(lei).toMatchObject({ is_non_conformant: true, value: 11.2, unit: 'pH', origin: 'MANUAL', recorded_by: A.operador.id, shift_instance_id: null })
    const oc = await prisma.occurrence.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })
    expect(oc).toMatchObject({ severity: 'HIGH', status: 'OPEN', type: 'OPERATIONAL', reported_by: A.operador.id, collection_point_id: A.ponto.id })
    expect(oc.description).toContain('Não Conformidade (pH): Leitura registrada = 11.2 pH')
    const horas = (oc.deadline.getTime() - antes) / 3_600_000
    expect(horas).toBeGreaterThan(23.9); expect(horas).toBeLessThan(24.1)
    expect(await prisma.shiftTask.count({ where: { occurrence_id: oc.id } })).toBe(1)
  })

  it('dentro da faixa: leitura conforme e nenhuma ocorrência', async () => {
    const A = await criarCenario('A'); const p = await parametro(A.tenant.id, A.gestor.id)
    actAs(A.operador)
    await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, parameter_id: p.id, value: '7', recorded_at: agora() }))
    expect((await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })).is_non_conformant).toBe(false)
    expect(await prisma.occurrence.count()).toBe(0)
  })

  it('sem parâmetro: grava com a unidade enviada, sem avaliar conformidade', async () => {
    const A = await criarCenario('A'); actAs(A.operador)
    await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, unit: 'm³/h', value: '3', recorded_at: agora() }))
    expect(await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })).toMatchObject({ is_non_conformant: null, unit: 'm³/h', parameter_id: null })
  })

  it('parâmetro de outra planta e ponto de outra planta: erros próprios, nada gravado', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B'); const pb = await parametro(B.tenant.id, B.gestor.id)
    actAs(A.operador)
    expect(await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, parameter_id: pb.id, value: '7', recorded_at: agora() })))
      .toEqual({ error: 'Parâmetro inválido ou não autorizado.' })
    expect(await registrarLeitura(null as never, form({ collection_point_id: B.ponto.id, parameter_id: pb.id, value: '7', recorded_at: agora() })))
      .toEqual({ error: 'Ponto de coleta inválido ou não autorizado.' })
    expect(await prisma.reading.count()).toBe(0)
  })

  it('entra só no turno aberto por quem registrou (T-18); o turno de um colega não conta', async () => {
    const A = await criarCenario('A')
    const colega = await prisma.user.create({ data: { tenant_id: A.tenant.id, role: 'OPERATOR', name: 'Colega', email: 'colega@teste.local', password_hash: 'x', must_change_password: false, is_active: true } })
    const turno = await prisma.shift.create({ data: { tenant_id: A.tenant.id, name: 'Manhã', start_time: '06:00', end_time: '14:00' } })
    const dele = await prisma.shiftInstance.create({ data: { tenant_id: A.tenant.id, shift_id: turno.id, date: new Date(), opened_by: colega.id, status: 'OPEN' } })
    actAs(A.operador)
    await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, value: '1', unit: 'x', recorded_at: agora() }))
    expect((await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })).shift_instance_id).toBeNull()

    const meu = await prisma.shiftInstance.create({ data: { tenant_id: A.tenant.id, shift_id: turno.id, date: new Date(), opened_by: A.operador.id, status: 'OPEN' } })
    await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, value: '2', unit: 'x', recorded_at: agora() }))
    const ult = await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id, value: 2 } })
    expect(ult.shift_instance_id).toBe(meu.id)
    expect(ult.shift_instance_id).not.toBe(dele.id)
  })

  it('unidade do parâmetro é copiada quando o formulário não manda a sua', async () => {
    const A = await criarCenario('A'); const p = await parametro(A.tenant.id, A.gestor.id, { unit: 'mg/L', min: null, max: 10 })
    actAs(A.operador)
    await registrarLeitura(null as never, form({ collection_point_id: A.ponto.id, parameter_id: p.id, value: '4', recorded_at: agora() }))
    expect(await prisma.reading.findFirstOrThrow({ where: { tenant_id: A.tenant.id } })).toMatchObject({ unit: 'mg/L', is_non_conformant: false })
  })
})
