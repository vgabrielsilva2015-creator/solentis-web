/** P0: saídas de estoque simultâneas não deixam o saldo negativo (trava por produto, T-13). */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form } from '@/test/auth-mock'
import { criarCenario, criarEntrada, criarUsuario } from '@/test/factories'
import { registrarSaida, registrarContagem } from '@/app/operador/estoque/actions'
import { registrarContagemDeEstoque, revisarContagemDeEstoque } from '@/server/estoque/service'
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

  it('contagem (>5%, fica pendente no M-04) e saída ao mesmo tempo, sob a trava: só a saída aplica, saldo 7, nunca negativo', async () => {
    const A = await criarCenario('A')
    await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)
    actAs(A.operador)
    // contagem 6 (−40%/−14%) fica PENDENTE — não ajusta; a saída 3 aplica sob a mesma trava.
    await Promise.all([
      registrarContagem(null, form({ product_id: A.produto.id, counted_quantity: '6', counted_at: agora() })),
      registrarSaida(null, form({ product_id: A.produto.id, quantity: '3', used_at: agora() })),
    ])
    const s = await saldo(A.tenant.id, A.produto.id)
    expect(s).toBeCloseTo(7)                 // 10 − 3 (contagem não mexeu no saldo)
    expect(s).toBeGreaterThanOrEqual(0)      // nunca negativo
    expect(await prisma.chemicalStockExit.count({ where: { notes: 'Ajuste por contagem física' } })).toBe(0)
  })
})

describe('revisão de contagem concorrente (M-04 — regressão E1)', () => {
  it('aprovar e rejeitar simultâneos: exatamente uma decisão vale, sem ajuste fantasma', async () => {
    for (let k = 0; k < 15; k++) {
      const A = await criarCenario('A')
      await criarEntrada(A.tenant.id, A.produto.id, A.gestor.id, 10)           // saldo 10
      const gestorB = await criarUsuario(A.tenant.id, 'MANAGER')
      // operador registra contagem 6 (−40% > 5% → PENDENTE, sem ajuste)
      await registrarContagemDeEstoque({
        tenantId: A.tenant.id, userId: A.operador.id, productId: A.produto.id,
        countedQuantity: 6, notes: null, countedAt: new Date(),
      })
      const count = await prisma.chemicalStockCount.findFirstOrThrow({
        where: { tenant_id: A.tenant.id, product_id: A.produto.id, review_status: 'PENDING' },
      })
      // dois gestores revisam a MESMA contagem ao mesmo tempo
      const [rA, rB] = await Promise.all([
        revisarContagemDeEstoque({ tenantId: A.tenant.id, reviewerId: A.gestor.id, countId: count.id, decisao: 'APROVAR', motivo: null }),
        revisarContagemDeEstoque({ tenantId: A.tenant.id, reviewerId: gestorB.id, countId: count.id, decisao: 'REJEITAR', motivo: 'suspeita' }),
      ])
      const oks = [rA, rB].filter((r) => (r as { ok?: boolean }).ok === true)
      const erros = [rA, rB].filter((r) => (r as { ok?: boolean }).ok === false)
      expect(oks).toHaveLength(1)                                  // só UMA decisão vale
      expect(erros).toHaveLength(1)
      expect((erros[0] as { error?: string }).error).toMatch(/já foi revisada/i)
      const fim = await prisma.chemicalStockCount.findUniqueOrThrow({ where: { id: count.id } })
      const ajusteAprov =
        (await prisma.chemicalStockExit.count({ where: { product_id: A.produto.id, notes: { contains: 'aprovada pelo gestor' } } })) +
        (await prisma.chemicalStockEntry.count({ where: { product_id: A.produto.id, notes: { contains: 'aprovada pelo gestor' } } }))
      if (fim.review_status === 'REJECTED') expect(ajusteAprov).toBe(0)   // nada de ajuste fantasma
      if (fim.review_status === 'APPLIED') expect(ajusteAprov).toBe(1)
    }
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
