'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  // Only render on deep pages, not on dashboards or root
  const isDashboard = pathname.endsWith('/dashboard') || pathname === '/login' || pathname === '/admin/plantas' || pathname === '/'
  
  useEffect(() => {
    if (window.history.length > 1) {
      setCanGoBack(true)
    }
  }, [])

  if (isDashboard) return null

  return (
    <div className="sticky top-[53px] z-20 w-full bg-card/80 backdrop-blur-md border-b border-border lg:hidden">
      <div className="mx-auto max-w-lg px-4 py-2">
        <button 
          onClick={() => {
            if (canGoBack) {
              router.back()
            } else {
              if (pathname.startsWith('/gestor')) router.push('/gestor/dashboard')
              else if (pathname.startsWith('/tecnico')) router.push('/tecnico/dashboard')
              else if (pathname.startsWith('/operador')) router.push('/operador/dashboard')
              else router.push('/')
            }
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors py-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
    </div>
  )
}
