'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { CHEMICAL_UNITS_PRESET } from '@/types'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user.id
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitValues = [...CHEMICAL_UNITS_PRESET, 'outro'] as const

const ProdutoSchema = z.object({
  name:        z.string().min(2, { error: 'Nome deve ter pelo menos 2 caracteres' }),
  unit_select: z.enum(unitValues, { error: 'Selecione a unidade' }),
  unit_custom: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(20).nullable(),
  ),
  min_stock: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Estoque mínimo inválido' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const EntradaSchema = z.object({
  product_id:     z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:       z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  supplier:       z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  invoice_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  notes:          z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  received_at:    z.string().min(1, { error: 'Data de recebimento obrigatória' }),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUnit(unit_select: string, unit_custom: string | null): string {
  return unit_select === 'outro' ? (unit_custom ?? '').trim() : unit_select
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function criarProduto(_prev: unknown, formData: FormData) {
  const session = await requireManager()

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalProduct.create({
    data: { tenant_id: TENANT_ID, name, unit, min_stock, description, created_by: recorded_by },
  })

  revalidatePath('/gestor/produtos-quimicos')
  return { success: true }
}

export async function editarProduto(_prev: unknown, formData: FormData) {
  await requireManager()

  const id = formData.get('id') as string
  if (!id) return { error: 'ID inválido' }

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  await prisma.chemicalProduct.update({
    where: { id },
    data:  { name, unit, min_stock, description },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
  return { success: true }
}

export async function toggleAtivoProduto(id: string, is_active: boolean) {
  await requireManager()

  await prisma.chemicalProduct.update({
    where: { id },
    data:  { is_active },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
}

export async function registrarEntrada(_prev: unknown, formData: FormData) {
  const session = await requireManagerOrTechnician()

  const parsed = EntradaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, supplier, invoice_number, notes, received_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockEntry.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      quantity,
      supplier,
      invoice_number,
      notes,
      received_at: new Date(received_at),
      recorded_by,
    },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${product_id}`)
  return { success: true }
}
