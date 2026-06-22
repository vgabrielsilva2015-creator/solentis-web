'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Definir estado inicial
    setIsOffline(!navigator.onLine)

    // Listeners
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-red-500/90 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-50 sticky top-0">
      <WifiOff className="w-4 h-4" />
      <span>Você está offline. O modo de leitura local está ativado.</span>
    </div>
  )
}
