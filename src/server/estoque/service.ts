/**
 * Regras de gravação do estoque (T-25). Sem sessão, sem FormData, sem revalidatePath:
 * recebe ids e valores já validados e devolve `{ ok }` ou `{ ok: false, error }`.
 * As actions só autenticam, validam a entrada, conferem a posse e atualizam a tela.
 *
 * T-13: TODA movimentação abre uma transação e trava a linha do produto antes de
 * ler o saldo (ver `src/lib/stock-lock.ts`). Há teste que exige isso.
 */
import { prisma } from '@/lib/prisma'
import { lockProduct, saldoAtual } from '@/lib/stock-lock'

export type Resultado = { ok: true } | { ok: false; error: string }

const PRODUTO_INVALIDO: Resultado = { ok: false, error: 'Produto inválido ou não autorizado.' }

export async function registrarSaidaDeEstoque(i: {
  tenantId: string; userId: string; productId: string; quantity: number; notes: string | null; usedAt: Date
}): Promise<Resultado> {
  // Trava o produto, lê o saldo e grava a saída na MESMA transação: duas saídas simultâneas
  // não passam juntas pela checagem de saldo.
  return prisma.$transaction(async (tx): Promise<Resultado> => {
    if (!(await lockProduct(tx, i.tenantId, i.productId))) return PRODUTO_INVALIDO

    const estoqueAtual = await saldoAtual(tx, i.tenantId, i.productId)
    if (estoqueAtual - i.quantity < 0) {
      return {
        ok: false,
        error: `Atenção: saída de ${i.quantity} resulta em estoque negativo (saldo atual é ${estoqueAtual.toFixed(2)}). Operação bloqueada.`,
      }
    }

    await tx.chemicalStockExit.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, quantity: i.quantity,
        notes: i.notes, used_at: i.usedAt, recorded_by: i.userId,
      },
    })
    return { ok: true }
  })
}

export async function registrarEntradaDeEstoque(i: {
  tenantId: string; userId: string; productId: string; quantity: number
  supplier: string | null; invoiceNumber: string | null; notes: string | null; receivedAt: Date
}): Promise<Resultado> {
  // A entrada também trava o produto, para não intercalar com uma contagem física
  // que esteja calculando o ajuste ao mesmo tempo.
  return prisma.$transaction(async (tx): Promise<Resultado> => {
    if (!(await lockProduct(tx, i.tenantId, i.productId))) return PRODUTO_INVALIDO
    await tx.chemicalStockEntry.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, quantity: i.quantity,
        supplier: i.supplier, invoice_number: i.invoiceNumber, notes: i.notes,
        received_at: i.receivedAt, recorded_by: i.userId,
      },
    })
    return { ok: true }
  })
}

export async function registrarContagemDeEstoque(i: {
  tenantId: string; userId: string; productId: string; countedQuantity: number; notes: string | null; countedAt: Date
}): Promise<Resultado> {
  // Contagem física = ajuste de inventário: cria uma movimentação da diferença para que o
  // saldo calculado passe a ser exatamente o valor contado. O saldo é lido com o produto travado.
  return prisma.$transaction(async (tx): Promise<Resultado> => {
    if (!(await lockProduct(tx, i.tenantId, i.productId))) return PRODUTO_INVALIDO
    const calculado = await saldoAtual(tx, i.tenantId, i.productId)
    const diff = i.countedQuantity - calculado

    await tx.chemicalStockCount.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, counted_quantity: i.countedQuantity,
        notes: i.notes, counted_at: i.countedAt, recorded_by: i.userId,
      },
    })

    const nota = 'Ajuste por contagem física'
    if (diff > 0) {
      await tx.chemicalStockEntry.create({
        data: { tenant_id: i.tenantId, product_id: i.productId, quantity: diff, notes: nota, received_at: i.countedAt, recorded_by: i.userId },
      })
    } else if (diff < 0) {
      await tx.chemicalStockExit.create({
        data: { tenant_id: i.tenantId, product_id: i.productId, quantity: -diff, notes: nota, used_at: i.countedAt, recorded_by: i.userId },
      })
    }
    return { ok: true }
  })
}
