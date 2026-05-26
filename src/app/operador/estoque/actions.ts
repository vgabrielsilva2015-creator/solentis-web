'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularEstoqueAtual } from '@/lib/stock-utils'

const TENANT_ID = 'default'

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
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

const SaidaSchema = z.object({
  product_id: z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:   z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  notes:   z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  used_at: z.string().min(1, { error: 'Data obrigatória' }),
})

const ContagemSchema = z.object({
  product_id:       z.string().min(1, { error: 'Produto obrigatório' }),
  counted_quantity: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  notes:      z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  counted_at: z.string().min(1, { error: 'Data obrigatória' }),
})

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function registrarSaida(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar saídas.' }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, notes, used_at } = parsed.data

  // Calcula estoque atual para verificar se ficará negativo
  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({
      where: { tenant_id: TENANT_ID, product_id },
      _sum:  { quantity: true },
    }),
    prisma.chemicalStockExit.aggregate({
      where: { tenant_id: TENANT_ID, product_id },
      _sum:  { quantity: true },
    }),
  ])

  const estoqueAtual = calcularEstoqueAtual(
    entries._sum.quantity ?? 0,
    exits._sum.quantity   ?? 0,
  )

  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockExit.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      quantity,
      notes,
      used_at:    new Date(used_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)

  const novoEstoque = estoqueAtual - quantity
  if (novoEstoque < 0) {
    return {
      success: true,
      warning: `Atenção: estoque calculado ficou negativo (${novoEstoque.toFixed(2)}). Verifique se há entradas não registradas ou faça uma contagem física.`,
    }
  }

  return { success: true }
}

export async function registrarContagem(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar contagens.' }

  const parsed = ContagemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, counted_quantity, notes, counted_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockCount.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      counted_quantity,
      notes,
      counted_at:  new Date(counted_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  return { success: true }
}
