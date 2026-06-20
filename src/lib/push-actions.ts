'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/web-push'

export async function subscribeUser(sub: PushSubscription) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  // @ts-ignore
  const p256dh = sub.keys?.p256dh
  // @ts-ignore
  const authKey = sub.keys?.auth

  if (!p256dh || !authKey) return { error: 'Invalid subscription' }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      user_id: session.user.id as string,
      p256dh,
      auth: authKey
    },
    create: {
      user_id: session.user.id as string,
      endpoint: sub.endpoint,
      p256dh,
      auth: authKey
    }
  })

  return { success: true }
}

export async function unsubscribeUser(endpoint: string) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, user_id: session.user.id }
  })

  return { success: true }
}

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
