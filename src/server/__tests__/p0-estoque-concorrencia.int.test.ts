/** P0: saídas de estoque simultâneas não deixam o saldo negativo (trava por produto, T-13). */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form } from '@/test/auth-mock'
import { criarCenario, criarEntrada } from '@/test/factories'
import { registrarSaida, registrarContagem } from '@/app/operador/estoque/actions'
import { saldoAtual } from '@/lib/stock-lock'

const agora = () => new Date().toISOString().slice(0, 16)
const saldo = (t: string, p: string) => prisma.$transaction((tx) => saldoAtual(tx, t, p))

describe('saídas simultâneas', () => {
  it('10 saídas de 3 kg em paralelo com saldo 10: só 3 passam e o saldo termina em 1', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    actAs(A.operador)
    const rs = await Promise.all(
      Array.from({ length: 10 }, () => registrarSaida(null, form({ product_id: A.produto.id, quantity: '3', used_at: agora() }))),
    )
    const ok = rs.filter((r) => r && 'success' in r && r.success).length
    const recusadas = rs.filter((r) => r && 'error' in r && r.error).length
    expect(ok).toBe(3)
    expect(recusadas).toBe(7)
    expect(await saldo(A.tenant.id, A.produto.id)).toBeCloseTo(1, 6)
    expect(await prisma.chemicalStockExit.count()).toBe(3)
  })

  it('duas saídas que juntas passam do saldo: exatamente uma é aceita', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 5)
    actAs(A.operador)
    const rs = await Promise.all([
      registrarSaida(null, form({ product_id: A.produto.id, quantity: '4', used_at: agora() })),
      registrarSaida(null, form({ product_id: A.produto.id, quantity: '4', used_at: agora() })),
    ])
    expect(rs.filter((r) => r && 'success' in r && r.success)).toHaveLength(1)
    expect(await saldo(A.tenant.id, A.produto.id)).toBeGreaterThanOrEqual(0)
  })

  it('saída que zera o saldo é aceita; a seguinte, de qualquer tamanho, é recusada', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 2)
    actAs(A.operador)
    expect(await registrarSaida(null, form({ product_id: A.produto.id, quantity: '2', used_at: agora() }))).toMatchObject({ success: true })
    expect(await registrarSaida(null, form({ product_id: A.produto.id, quantity: '0,5', used_at: agora() }))).toMatchObject({ error: expect.stringMatching(/negativo/i) })
  })

  it('contagem física e saída ao mesmo tempo: o saldo final é o contado ou o contado menos a saída, nunca negativo', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    actAs(A.operador)
    await Promise.all([
      registrarContagem(null, form({ product_id: A.produto.id, counted_quantity: '6', counted_at: agora() })),
      registrarSaida(null, form({ product_id: A.produto.id, quantity: '3', used_at: agora() })),
    ])
    const s = await saldo(A.tenant.id, A.produto.id)
    expect([3, 6]).toContainEqual(expect.closeTo(s, 6))
  })
})

describe('controle negativo: o teste enxerga a corrida', () => {
  it('uma saída SEM a trava (escrita só para este teste) deixa o saldo negativo — por isso a trava existe', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    const semTrava = async () => {
      // lê o saldo e grava em seguida, sem FOR UPDATE: duas chamadas juntas leem o mesmo saldo
      const s = await prisma.$transaction((tx) => saldoAtual(tx, A.tenant.id, A.produto.id))
      if (s - 3 < 0) return false
      await new Promise((r) => setTimeout(r, 25)) // janela da corrida
      await prisma.chemicalStockExit.create({ data: { tenant_id: A.tenant.id, product_id: A.produto.id, quantity: 3, used_at: new Date(), recorded_by: A.operador.id } })
      return true
    }
    await Promise.all(Array.from({ length: 10 }, semTrava))
    expect(await saldo(A.tenant.id, A.produto.id)).toBeLessThan(0)
  })
})
