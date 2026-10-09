/**
 * Serialização das movimentações de estoque por produto (T-13).
 *
 * Saldo = soma(entradas) − soma(saídas), calculado na hora. Sem trava, duas
 * saídas simultâneas liam o mesmo saldo e ambas passavam pela checagem de
 * "não pode ficar negativo" (reproduzido: 10 saídas de 3 kg com saldo 10 →
 * as 10 aceitas, saldo −20). A contagem física tinha o mesmo problema: o ajuste
 * era calculado sobre um saldo que outra transação já tinha mudado.
 *
 * Toda movimentação abre uma transação e trava a LINHA do produto
 * (SELECT … FOR UPDATE). Quem chega depois espera; lê o saldo já atualizado.
 * Funciona com o pooler em modo transação (a transação usa uma conexão só).
 */
import type { Prisma } from '@prisma/client'
import { calcularEstoqueAtual } from '@/lib/stock-utils'

/** Trava o produto (e confirma que é do tenant). Devolve false se não existir. */
export async function lockProduct(tx: Prisma.TransactionClient, tenantId: string, productId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM chemical_products
    WHERE id = ${productId} AND tenant_id = ${tenantId}
    FOR UPDATE`
  return rows.length === 1
}

/** Saldo calculado do produto, lido DENTRO da transação que segura a trava. */
export async function saldoAtual(tx: Prisma.TransactionClient, tenantId: string, productId: string): Promise<number> {
  const [entradas, saidas] = await Promise.all([
    tx.chemicalStockEntry.aggregate({ where: { tenant_id: tenantId, product_id: productId }, _sum: { quantity: true } }),
    tx.chemicalStockExit.aggregate({ where: { tenant_id: tenantId, product_id: productId }, _sum: { quantity: true } }),
  ])
  return calcularEstoqueAtual(entradas._sum.quantity ?? 0, saidas._sum.quantity ?? 0)
}
