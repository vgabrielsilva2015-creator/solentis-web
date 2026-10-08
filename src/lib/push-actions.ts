'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
