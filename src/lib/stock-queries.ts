import { prisma } from '@/lib/prisma'

export type ProductWithStock = {
  id: string
  name: string
  unit: string
  min_stock: number
  is_active: boolean
  description: string | null
  current_stock: number
  status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  last_count: { counted_quantity: number, counted_at: Date } | null
}

/**
 * Retorna todos os produtos de um tenant com o estoque atual calculado 
 * via agregação nativa (_sum), sem carregar todo o histórico em memória.
 */
export async function getProductsWithStock(tenantId: string, includeInactive = false, search?: string): Promise<ProductWithStock[]> {
  const whereClause: any = includeInactive ? { tenant_id: tenantId } : { tenant_id: tenantId, is_active: true }
  
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  const products = await prisma.chemicalProduct.findMany({
    where: whereClause,
    select: { 
      id: true, 
      name: true, 
      unit: true, 
      min_stock: true, 
      is_active: true,
      description: true,
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 }
    }
  })

  if (products.length === 0) return []

  const productIds = products.map(p => p.id)

  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.groupBy({
      by: ['product_id'],
      where: { tenant_id: tenantId, product_id: { in: productIds } },
      _sum: { quantity: true }
    }),
    prisma.chemicalStockExit.groupBy({
      by: ['product_id'],
      where: { tenant_id: tenantId, product_id: { in: productIds } },
      _sum: { quantity: true }
    })
  ])

  const entryMap = new Map(entries.map(e => [e.product_id, e._sum.quantity || 0]))
  const exitMap = new Map(exits.map(e => [e.product_id, e._sum.quantity || 0]))

  return products.map(p => {
    const totalIn = entryMap.get(p.id) || 0
    const totalOut = exitMap.get(p.id) || 0
    const current_stock = totalIn - totalOut

    let status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OK'
    if (current_stock <= 0) status = 'OUT_OF_STOCK'
    else if (current_stock <= p.min_stock) status = 'LOW_STOCK'

    const { counts, ...rest } = p
    return {
      ...rest,
      current_stock,
      status,
      last_count: counts?.[0] ?? null
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getProductWithStock(tenantId: string, productId: string, includeInactive = false): Promise<ProductWithStock | null> {
  const product = await prisma.chemicalProduct.findUnique({
    where: includeInactive ? { id: productId, tenant_id: tenantId } : { id: productId, tenant_id: tenantId, is_active: true },
    select: { 
      id: true, 
      name: true, 
      unit: true, 
      min_stock: true, 
      is_active: true,
      description: true,
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 }
    }
  })
  
  if (!product) return null

  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({
      where: { tenant_id: tenantId, product_id: productId },
      _sum: { quantity: true }
    }),
    prisma.chemicalStockExit.aggregate({
      where: { tenant_id: tenantId, product_id: productId },
      _sum: { quantity: true }
    })
  ])

  const current_stock = (entries._sum.quantity || 0) - (exits._sum.quantity || 0)
  
  let status: 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OK'
  if (current_stock <= 0) status = 'OUT_OF_STOCK'
  else if (current_stock <= product.min_stock) status = 'LOW_STOCK'

  const { counts, ...rest } = product
  return {
    ...rest,
    current_stock,
    status,
    last_count: counts?.[0] ?? null
  }
}
