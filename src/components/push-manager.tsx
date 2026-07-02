'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser } from '@/lib/push-actions'
import { Bell, BellOff } from 'lucide-react'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushManager() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true)
        })
      })
    }
  }, [])

  const subscribe = async () => {
    if (!registration) return
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      })
      await subscribeUser(sub as any)
      setIsSubscribed(true)
    } catch (err) {
      console.error('Failed to subscribe', err)
    }
  }

  const unsubscribe = async () => {
    if (!registration) return
    try {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await unsubscribeUser(sub.endpoint)
        await sub.unsubscribe()
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Failed to unsubscribe', err)
    }
  }

  if (!isSupported) return null

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title={isSubscribed ? "Desativar Notificações" : "Ativar Notificações"}
    >
      {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  )
}
