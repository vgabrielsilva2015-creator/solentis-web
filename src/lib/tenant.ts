import { auth } from '@/lib/auth'

/**
 * Retrieves the `tenantId` of the currently logged-in user.
 * For server components and server actions.
 * Throws an error if the user is not authenticated or lacks a tenantId.
 */
export async function getTenantId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error('Acesso não autorizado: Tenant não encontrado.')
  }
  return session.user.tenantId
}
