'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularEstoqueAtual } from '@/lib/stock-utils'
import { getTenantId, resolveUserId } from '@/lib/tenant'
import { localInputToUTC } from '@/lib/date-utils'
import { redirect } from 'next/navigation'


async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
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
  if (!['OPERATOR', 'TECHNICIAN'].includes(session.user.role)) return { error: 'Apenas operadores ou técnicos podem registrar saídas.' }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, notes, used_at } = parsed.data

  // Calcula estoque atual para verificar se ficará negativo
  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({
      where: { tenant_id: (await getTenantId()), product_id },
      _sum:  { quantity: true },
    }),
    prisma.chemicalStockExit.aggregate({
      where: { tenant_id: (await getTenantId()), product_id },
      _sum:  { quantity: true },
    }),
  ])

  const estoqueAtual = calcularEstoqueAtual(
    entries._sum.quantity ?? 0,
    exits._sum.quantity   ?? 0,
  )

  const recorded_by = await resolveUserId(session.user.email!)
  if (!recorded_by) return { error: 'Sessão inválida.' }

  const novoEstoque = estoqueAtual - quantity
  if (novoEstoque < 0) {
    return {
      error: `Atenção: saída de ${quantity} resulta em estoque negativo (saldo atual é ${estoqueAtual.toFixed(2)}). Operação bloqueada.`,
    }
  }

  await prisma.chemicalStockExit.create({
    data: {
      tenant_id: (await getTenantId()),
      product_id,
      quantity,
      notes,
      used_at:    localInputToUTC(used_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  revalidatePath('/tecnico/estoque')
  revalidatePath(`/tecnico/estoque/${product_id}`)
  revalidatePath('/gestor/dashboard')

  return { success: true }
}

export async function registrarContagem(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (!['OPERATOR', 'TECHNICIAN'].includes(session.user.role)) return { error: 'Apenas operadores ou técnicos podem registrar contagens.' }

  const parsed = ContagemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, counted_quantity, notes, counted_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)
  if (!recorded_by) return { error: 'Sessão inválida.' }

  const tenantId = await getTenantId()
  const countedAtUTC = localInputToUTC(counted_at)

  // Saldo calculado atual (entradas - saídas) antes do ajuste
  const [entradas, saidas] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({ where: { tenant_id: tenantId, product_id }, _sum: { quantity: true } }),
    prisma.chemicalStockExit.aggregate({ where: { tenant_id: tenantId, product_id }, _sum: { quantity: true } }),
  ])
  const calculado = calcularEstoqueAtual(entradas._sum.quantity ?? 0, saidas._sum.quantity ?? 0)
  const diff = counted_quantity - calculado

  // Contagem física = ajuste de inventário: cria uma movimentação da diferença
  // para que o saldo calculado passe a ser exatamente o valor contado.
  await prisma.$transaction(async (tx) => {
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
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  revalidatePath('/tecnico/estoque')
  revalidatePath('/gestor/dashboard')
  return { success: true }
}
