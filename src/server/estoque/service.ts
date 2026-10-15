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
import { decidirContagem } from '@/lib/stock-review'
import { logAudit } from '@/lib/audit'

export type Resultado = { ok: true } | { ok: false; error: string }
/** Contagem: `pending` = divergência acima do limite, aguardando aprovação do gestor. */
export type ResultadoContagem = { ok: true; pending: boolean } | { ok: false; error: string }

const PRODUTO_INVALIDO = { ok: false, error: 'Produto inválido ou não autorizado.' } as const

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

    const saida = await tx.chemicalStockExit.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, quantity: i.quantity,
        notes: i.notes, used_at: i.usedAt, recorded_by: i.userId,
      },
    })
    // E8 — rastreabilidade: toda movimentação de estoque audita.
    await logAudit(tx, {
      tenantId: i.tenantId, userId: i.userId, action: 'CREATE',
      tableName: 'chemical_stock_exits', recordId: saida.id,
      after: { product_id: i.productId, quantity: i.quantity },
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
    const entrada = await tx.chemicalStockEntry.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, quantity: i.quantity,
        supplier: i.supplier, invoice_number: i.invoiceNumber, notes: i.notes,
        received_at: i.receivedAt, recorded_by: i.userId,
      },
    })
    // E8 — rastreabilidade: toda movimentação de estoque audita.
    await logAudit(tx, {
      tenantId: i.tenantId, userId: i.userId, action: 'CREATE',
      tableName: 'chemical_stock_entries', recordId: entrada.id,
      after: { product_id: i.productId, quantity: i.quantity, supplier: i.supplier },
    })
    return { ok: true }
  })
}

export async function registrarContagemDeEstoque(i: {
  tenantId: string; userId: string; productId: string; countedQuantity: number; notes: string | null; countedAt: Date
}): Promise<ResultadoContagem> {
  // Contagem física = ajuste de inventário. M-04: divergência ≤ limite ajusta direto;
  // acima do limite a contagem fica PENDENTE e só ajusta após aprovação do gestor.
  // O saldo é lido com o produto travado.
  return prisma.$transaction(async (tx): Promise<ResultadoContagem> => {
    if (!(await lockProduct(tx, i.tenantId, i.productId))) return PRODUTO_INVALIDO
    const calculado = await saldoAtual(tx, i.tenantId, i.productId)
    const { aplicar, diff } = decidirContagem(calculado, i.countedQuantity)

    const count = await tx.chemicalStockCount.create({
      data: {
        tenant_id: i.tenantId, product_id: i.productId, counted_quantity: i.countedQuantity,
        notes: i.notes, counted_at: i.countedAt, recorded_by: i.userId,
        review_status: aplicar ? 'APPLIED' : 'PENDING',
      },
    })

    if (aplicar) {
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
    }

    await logAudit(tx, {
      tenantId: i.tenantId, userId: i.userId, action: 'CREATE',
      tableName: 'chemical_stock_counts', recordId: count.id,
      after: { counted: i.countedQuantity, calculado, diff, status: aplicar ? 'APPLIED' : 'PENDING' },
    })

    return { ok: true, pending: !aplicar }
  })
}

// M-04: o gestor revisa uma contagem PENDENTE. Aprovar aplica o ajuste no momento
// (recalcula a diferença com o produto travado); rejeitar descarta sem mexer no estoque.
// Separação de funções: quem registrou a contagem não pode revisá-la.
export async function revisarContagemDeEstoque(i: {
  tenantId: string; reviewerId: string; countId: string; decisao: 'APROVAR' | 'REJEITAR'; motivo: string | null
}): Promise<Resultado> {
  return prisma.$transaction(async (tx): Promise<Resultado> => {
    const count = await tx.chemicalStockCount.findFirst({
      where:  { id: i.countId, tenant_id: i.tenantId },
      select: { product_id: true, counted_quantity: true, recorded_by: true, review_status: true, counted_at: true },
    })
    if (!count) return { ok: false, error: 'Contagem não encontrada.' }
    if (count.review_status !== 'PENDING') return { ok: false, error: 'Esta contagem já foi revisada.' }
    if (count.recorded_by === i.reviewerId) {
      return { ok: false, error: 'Você não pode revisar uma contagem que registrou. Peça a outro gestor.' }
    }

    // Trava o produto antes de qualquer gravação (serializa com outras movimentações).
    if (!(await lockProduct(tx, i.tenantId, count.product_id))) return PRODUTO_INVALIDO
    const now = new Date()

    // E1: a transição de status (condicionada a PENDING) é a trava autoritativa e
    // vem ANTES de qualquer efeito colateral. Sob a trava do produto, duas revisões
    // concorrentes serializam; a segunda vê `count === 0` e aborta — sem dupla decisão
    // nem ajuste fantasma. (O `findFirst` acima é só atalho de erro amigável.)
    if (i.decisao === 'REJEITAR') {
      const { count: afetadas } = await tx.chemicalStockCount.updateMany({
        where: { id: i.countId, tenant_id: i.tenantId, review_status: 'PENDING' },
        data:  { review_status: 'REJECTED', reviewed_by: i.reviewerId, reviewed_at: now, review_reason: i.motivo },
      })
      if (afetadas === 0) return { ok: false, error: 'Esta contagem já foi revisada.' }
      await logAudit(tx, {
        tenantId: i.tenantId, userId: i.reviewerId, action: 'UPDATE',
        tableName: 'chemical_stock_counts', recordId: i.countId,
        before: { review_status: 'PENDING' }, after: { review_status: 'REJECTED' },
        justification: i.motivo,
      })
      return { ok: true }
    }

    // APROVAR: ganha a transição primeiro; só então recalcula e aplica a diferença.
    const { count: afetadas } = await tx.chemicalStockCount.updateMany({
      where: { id: i.countId, tenant_id: i.tenantId, review_status: 'PENDING' },
      data:  { review_status: 'APPLIED', reviewed_by: i.reviewerId, reviewed_at: now },
    })
    if (afetadas === 0) return { ok: false, error: 'Esta contagem já foi revisada.' }

    const calculado = await saldoAtual(tx, i.tenantId, count.product_id)
    const diff = count.counted_quantity - calculado
    const nota = 'Ajuste por contagem física (aprovada pelo gestor)'
    if (diff > 0) {
      await tx.chemicalStockEntry.create({
        data: { tenant_id: i.tenantId, product_id: count.product_id, quantity: diff, notes: nota, received_at: now, recorded_by: i.reviewerId },
      })
    } else if (diff < 0) {
      await tx.chemicalStockExit.create({
        data: { tenant_id: i.tenantId, product_id: count.product_id, quantity: -diff, notes: nota, used_at: now, recorded_by: i.reviewerId },
      })
    }
    await logAudit(tx, {
      tenantId: i.tenantId, userId: i.reviewerId, action: 'UPDATE',
      tableName: 'chemical_stock_counts', recordId: i.countId,
      before: { review_status: 'PENDING' }, after: { review_status: 'APPLIED', diff },
    })
    return { ok: true }
  })
}
