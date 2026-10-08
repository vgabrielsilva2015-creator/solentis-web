'use server'

import { requirePermission } from '@/server/auth/guards'
import { medir } from '@/lib/observability'
import { EntradaSchema } from '@/server/estoque/schema'
import { registrarEntradaDeEstoque } from '@/server/estoque/service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { CHEMICAL_UNITS_PRESET } from '@/types'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'
import { localInputToUTC } from '@/lib/date-utils'
import { redirect } from 'next/navigation'




// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitValues = [...CHEMICAL_UNITS_PRESET, 'outro'] as const

const ProdutoSchema = z.object({
  name:        z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, { error: 'Nome deve ter pelo menos 2 caracteres' }),
  unit_select: z.enum(unitValues, { error: 'Selecione a unidade' }),
  unit_custom: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(20).nullable(),
  ),
  min_stock: numeroBR({ min: 0, rotulo: 'O estoque mínimo', obrigatorio: 'Informe o estoque mínimo.' }),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000, 'Texto muito longo (máximo 2000 caracteres).').nullable(),
  ),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUnit(unit_select: string, unit_custom: string | null): string {
  return unit_select === 'outro' ? (unit_custom ?? '').trim() : unit_select
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function criarProduto(_prev: unknown, formData: FormData) {
  const ctx = await requirePermission('config.manage')

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  const recorded_by = ctx.userId

  await prisma.chemicalProduct.create({
    data: { tenant_id: (await getTenantId()), name, unit, min_stock, description, created_by: recorded_by },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath('/gestor/dashboard')
  return { success: true }
}

export async function editarProduto(_prev: unknown, formData: FormData) {
  await requirePermission('config.manage')

  const id = formData.get('id') as string
  if (!id) return { error: 'ID inválido' }

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  await prisma.chemicalProduct.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data:  { name, unit, min_stock, description },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
  revalidatePath('/gestor/dashboard')
  return { success: true }
}

export async function toggleAtivoProduto(id: string, is_active: boolean) {
  await requirePermission('config.manage')

  await prisma.chemicalProduct.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data:  { is_active },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
  revalidatePath('/gestor/dashboard')
}

async function registrarEntradaImpl(_prev: unknown, formData: FormData) {
  const ctx = await requirePermission('stock.receive')

  const parsed = EntradaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  const { product_id, quantity, supplier, invoice_number, notes, received_at } = parsed.data

  const erroPosse = await checkOwnership(ctx.tenantId, [{ model: 'chemicalProduct', id: product_id }])
  if (erroPosse) return { error: erroPosse }

  // T-25: a regra (trava do produto + gravação) está em `src/server/estoque/service.ts`
  const r = await registrarEntradaDeEstoque({
    tenantId: ctx.tenantId, userId: ctx.userId, productId: product_id, quantity, supplier,
    invoiceNumber: invoice_number, notes, receivedAt: localInputToUTC(received_at),
  })
  if (!r.ok) return { error: r.error }

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${product_id}`)
  revalidatePath('/gestor/dashboard')
  return { success: true }
}

export async function excluirProduto(id: string) {
  await requirePermission('config.manage')
  const tenantId = await getTenantId()

  const [entries, exits, counts] = await Promise.all([
    prisma.chemicalStockEntry.count({ where: { tenant_id: tenantId, product_id: id } }),
    prisma.chemicalStockExit.count({ where: { tenant_id: tenantId, product_id: id } }),
    prisma.chemicalStockCount.count({ where: { tenant_id: tenantId, product_id: id } }),
  ])

  if (entries + exits + counts > 0) {
    return { error: 'Este produto possui movimentações registradas e não pode ser excluído. Use "Desativar" para tirá-lo de uso preservando o histórico.' }
  }

  await prisma.chemicalProduct.deleteMany({ where: { id, tenant_id: tenantId } })
  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath('/gestor/dashboard')
  redirect('/gestor/produtos-quimicos')
}

// ─── T-30: medição de duração/erro (composição; o contrato das ações não muda) ───
export async function registrarEntrada(...args: Parameters<typeof registrarEntradaImpl>) {
  return medir('registrarEntrada', () => registrarEntradaImpl(...args))
}
