import { cache } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Retrieves the `tenantId` of the currently logged-in user.
 * For server components and server actions.
 * Throws an error if the user is not authenticated or lacks a tenantId.
 *
 * Envolto em React cache(): dentro de uma mesma requisição, auth()/decode do
 * JWT roda uma única vez, mesmo com múltiplas chamadas. Comportamento idêntico.
 */
export const getTenantId = cache(async (): Promise<string> => {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error('Acesso não autorizado: Tenant não encontrado.')
  }
  return session.user.tenantId
})

/**
 * Resolves a user ID by email within the current tenant.
 * Uses case-insensitive email matching to avoid casing mismatches.
 * Returns null if user not found.
 */
export async function resolveUserId(email: string): Promise<string | null> {
  const tenantId = await getTenantId()
  const user = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      email: { equals: email, mode: 'insensitive' },
      is_active: true,
    },
    select: { id: true },
  })
  return user?.id ?? null
}

/**
 * Resolves a user record (id + email) by email within the current tenant.
 * Uses case-insensitive email matching. Returns null if user not found.
 */
export async function resolveUser(email: string): Promise<{ id: string; email: string } | null> {
  const tenantId = await getTenantId()
  const user = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      email: { equals: email, mode: 'insensitive' },
      is_active: true,
    },
    select: { id: true, email: true },
  })
  return user ?? null
}

