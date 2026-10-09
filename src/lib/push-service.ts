/**
 * Envio de push para o servidor. NÃO é server action (T-21 / V-11): não pode
 * morar em arquivo 'use server', senão vira endpoint público sem autenticação.
 * Quem chama (outra action ou rota) já passou pelo guard.
 */
import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/web-push'

export async function sendPushToRole(tenantId: string, role: string, payload: { title: string, body: string, url?: string }) {
  const subs = await prisma.pushSubscription.findMany({
    where: {
      user: {
        tenant_id: tenantId,
        role: role,
        is_active: true
      }
    }
  })

  const results = await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  // Remove inscrições inválidas
  subs.forEach((sub, i) => {
    const res = results[i]
    if (res.status === 'rejected' && res.reason?.statusCode === 410) {
      prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
    }
  })
}

export async function sendPushToUsers(userIds: string[], payload: { title: string, body: string, url?: string }) {
  if (userIds.length === 0) return

  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: { in: userIds } }
  })

  const results = await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  subs.forEach((sub, i) => {
    const res = results[i]
    if (res.status === 'rejected' && res.reason?.statusCode === 410) {
      prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
    }
  })
}
