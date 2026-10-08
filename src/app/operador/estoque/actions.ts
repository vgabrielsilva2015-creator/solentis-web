'use server'

import { getActor, permissionError } from '@/server/auth/guards'
import { medir } from '@/lib/observability'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { lockProduct, saldoAtual } from '@/lib/stock-lock'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'
import { localInputToUTC } from '@/lib/date-utils'



// ─── Schemas ──────────────────────────────────────────────────────────────────

const SaidaSchema = z.object({
  product_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, { error: 'Produto obrigatório' }),
  // T-16: antes parseFloat('2,5') gravava 2
  quantity:   numeroBR({ positivo: true, rotulo: 'A quantidade', obrigatorio: 'Informe a quantidade.' }),
  notes:   z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
  used_at: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, { error: 'Data obrigatória' }),
})

const ContagemSchema = z.object({
  product_id:       z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, { error: 'Produto obrigatório' }),
  counted_quantity: numeroBR({ min: 0, rotulo: 'A quantidade contada', obrigatorio: 'Informe a quantidade contada.' }),
  notes:      z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
  counted_at: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, { error: 'Data obrigatória' }),
})

// ─── Actions ──────────────────────────────────────────────────────────────────

async function registrarSaidaImpl(_prev: unknown, formData: FormData) {
  const ctx = await getActor()
  const negado = permissionError(ctx, 'stock.move')
  if (negado) return { error: negado }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, notes, used_at } = parsed.data

  const erroPosse = await checkOwnership(await getTenantId(), [{ model: 'chemicalProduct', id: product_id }])
  if (erroPosse) return { error: erroPosse }

  const recorded_by = ctx.userId

  const tenantId = await getTenantId()

  // T-13: trava o produto, lê o saldo e grava a saída na MESMA transação.
  // Duas saídas simultâneas não passam mais juntas pela checagem de saldo.
  const resultado = await prisma.$transaction(async (tx) => {
    if (!(await lockProduct(tx, tenantId, product_id))) return { error: 'Produto inválido ou não autorizado.' }

    const estoqueAtual = await saldoAtual(tx, tenantId, product_id)
    if (estoqueAtual - quantity < 0) {
      return {
        error: `Atenção: saída de ${quantity} resulta em estoque negativo (saldo atual é ${estoqueAtual.toFixed(2)}). Operação bloqueada.`,
      }
    }

    await tx.chemicalStockExit.create({
      data: {
        tenant_id: tenantId,
        product_id,
        quantity,
        notes,
        used_at:    localInputToUTC(used_at),
        recorded_by,
      },
    })
    return null
  })
  if (resultado) return resultado

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  revalidatePath('/tecnico/estoque')
  revalidatePath(`/tecnico/estoque/${product_id}`)
  revalidatePath('/gestor/dashboard')

  return { success: true }
}

async function registrarContagemImpl(_prev: unknown, formData: FormData) {
  const ctx = await getActor()
  const negado = permissionError(ctx, 'stock.move')
  if (negado) return { error: negado }

  const parsed = ContagemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, counted_quantity, notes, counted_at } = parsed.data
  const recorded_by = ctx.userId

  const tenantId = await getTenantId()
  const countedAtUTC = localInputToUTC(counted_at)

  const erroPosse = await checkOwnership(tenantId, [{ model: 'chemicalProduct', id: product_id }])
  if (erroPosse) return { error: erroPosse }

  // Contagem física = ajuste de inventário: cria uma movimentação da diferença
  // para que o saldo calculado passe a ser exatamente o valor contado.
  // T-13: o saldo é lido com o produto travado, dentro da transação do ajuste.
  const ok = await prisma.$transaction(async (tx) => {
    if (!(await lockProduct(tx, tenantId, product_id))) return false
    const calculado = await saldoAtual(tx, tenantId, product_id)
    const diff = counted_quantity - calculado

    await tx.chemicalStockCount.create({
      data: {
        tenant_id: tenantId,
        product_id,
        counted_quantity,
        notes,
        counted_at: countedAtUTC,
        recorded_by,
      },
    })

    if (diff > 0) {
      await tx.chemicalStockEntry.create({
        data: {
          tenant_id: tenantId,
          product_id,
          quantity: diff,
          notes: 'Ajuste por contagem física',
          received_at: countedAtUTC,
          recorded_by,
        },
      })
    } else if (diff < 0) {
      await tx.chemicalStockExit.create({
        data: {
          tenant_id: tenantId,
          product_id,
          quantity: -diff,
          notes: 'Ajuste por contagem física',
          used_at: countedAtUTC,
          recorded_by,
        },
      })
    }
    return true
  })
  if (!ok) return { error: 'Produto inválido ou não autorizado.' }

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  revalidatePath('/tecnico/estoque')
  revalidatePath('/gestor/dashboard')
  return { success: true }
}

// ─── T-30: medição de duração/erro (composição; o contrato das ações não muda) ───
export async function registrarSaida(...args: Parameters<typeof registrarSaidaImpl>) {
  return medir('registrarSaida', () => registrarSaidaImpl(...args))
}
export async function registrarContagem(...args: Parameters<typeof registrarContagemImpl>) {
  return medir('registrarContagem', () => registrarContagemImpl(...args))
}
