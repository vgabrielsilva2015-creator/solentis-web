'use server'

import { getActor, permissionError } from '@/server/auth/guards'
import { medir } from '@/lib/observability'
import { revalidatePath } from 'next/cache'
import { checkOwnership } from '@/lib/ownership'
import { localInputToUTC } from '@/lib/date-utils'
import { SaidaSchema, ContagemSchema } from '@/server/estoque/schema'
import { registrarSaidaDeEstoque, registrarContagemDeEstoque } from '@/server/estoque/service'

// T-25: a regra de gravação (trava do produto, saldo, ajuste) está em `src/server/estoque/service.ts`.
// Aqui ficam só: quem pode, validação da entrada, posse do produto e atualização das telas.

async function registrarSaidaImpl(_prev: unknown, formData: FormData) {
  const ctx = await getActor()
  const negado = permissionError(ctx, 'stock.move')
  if (negado) return { error: negado }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  const { product_id, quantity, notes, used_at } = parsed.data

  const erroPosse = await checkOwnership(ctx.tenantId, [{ model: 'chemicalProduct', id: product_id }])
  if (erroPosse) return { error: erroPosse }

  const r = await registrarSaidaDeEstoque({
    tenantId: ctx.tenantId, userId: ctx.userId, productId: product_id, quantity, notes, usedAt: localInputToUTC(used_at),
  })
  if (!r.ok) return { error: r.error }

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  const { product_id, counted_quantity, notes, counted_at } = parsed.data

  const erroPosse = await checkOwnership(ctx.tenantId, [{ model: 'chemicalProduct', id: product_id }])
  if (erroPosse) return { error: erroPosse }

  const r = await registrarContagemDeEstoque({
    tenantId: ctx.tenantId, userId: ctx.userId, productId: product_id,
    countedQuantity: counted_quantity, notes, countedAt: localInputToUTC(counted_at),
  })
  if (!r.ok) return { error: r.error }

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
