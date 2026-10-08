/**
 * P0 (seção 13 da auditoria): ID de OUTRA planta enviado a uma action → erro e nada gravado.
 * Banco real; actions reais; só a sessão é simulada.
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form } from '@/test/auth-mock'
import { criarCenario, criarCategoria, criarProduto, criarPonto } from '@/test/factories'
import { registrarSaida, registrarContagem } from '@/app/operador/estoque/actions'
import { registrarLeitura } from '@/app/operador/leituras/actions'

const agora = () => new Date().toISOString().slice(0, 16)

describe('estoque: produto de outra planta', () => {
  it('saída com produto da planta B, logado na A: erro, nada gravado, saldo de B intacto', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    actAs(A.operador)
    const r = await registrarSaida(null, form({ product_id: B.produto.id, quantity: '1', used_at: agora() }))
    expect(r).toMatchObject({ error: expect.stringMatching(/inválido ou não autorizado/i) })
    expect(await prisma.chemicalStockExit.count()).toBe(0)
  })

  it('contagem com produto da planta B: erro, nada gravado', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    actAs(A.operador)
    const r = await registrarContagem(null, form({ product_id: B.produto.id, counted_quantity: '5', counted_at: agora() }))
    expect(r).toMatchObject({ error: expect.stringMatching(/inválido ou não autorizado/i) })
    expect(await prisma.chemicalStockCount.count()).toBe(0)
    expect(await prisma.chemicalStockEntry.count()).toBe(0)
  })

  it('controle: o mesmo produto, na própria planta, funciona', async () => {
    const A = await criarCenario('A')
    await prisma.chemicalStockEntry.create({ data: { tenant_id: A.tenant.id, product_id: A.produto.id, recorded_by: A.gestor.id, quantity: 10, received_at: new Date() } })
    actAs(A.operador)
    const r = await registrarSaida(null, form({ product_id: A.produto.id, quantity: '4', used_at: agora() }))
    expect(r).toMatchObject({ success: true })
    expect(await prisma.chemicalStockExit.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
  })
})

describe('leitura: ponto de outra planta', () => {
  it('ponto da planta B, logado na A: erro, nenhuma leitura gravada', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    actAs(A.operador)
    const r = await registrarLeitura({}, form({ collection_point_id: B.ponto.id, recorded_at: agora() }))
    expect(r.error).toMatch(/inválido ou não autorizado/i)
    expect(await prisma.reading.count()).toBe(0)
  })

  it('controle: ponto da própria planta grava com a planta da sessão', async () => {
    const A = await criarCenario('A')
    actAs(A.operador)
    const r = await registrarLeitura({}, form({ collection_point_id: A.ponto.id, recorded_at: agora() }))
    expect(r.success).toBe(true)
    const l = await prisma.reading.findMany()
    expect(l).toHaveLength(1)
    expect(l[0].tenant_id).toBe(A.tenant.id)
  })
})

describe('fábricas não vazam entre plantas', () => {
  it('categoria/produto/ponto criados para B não aparecem filtrando por A', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    await criarCategoria(B.tenant.id); await criarProduto(B.tenant.id, B.gestor.id); await criarPonto(B.tenant.id)
    expect(await prisma.equipmentCategory.count({ where: { tenant_id: A.tenant.id } })).toBe(0)
    expect(await prisma.chemicalProduct.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
    expect(await prisma.collectionPoint.count({ where: { tenant_id: A.tenant.id } })).toBe(1)
  })
})

describe('controle negativo: o banco sozinho não protege', () => {
  it('a chave estrangeira aceita o ponto de outra planta; quem barra é a camada da aplicação (os testes acima)', async () => {
    const A = await criarCenario('A'); const B = await criarCenario('B')
    await prisma.reading.create({ data: { tenant_id: A.tenant.id, collection_point_id: B.ponto.id, recorded_by: A.operador.id, recorded_at: new Date() } })
    expect(await prisma.reading.count({ where: { tenant_id: A.tenant.id, collection_point_id: B.ponto.id } })).toBe(1)
  })
})
