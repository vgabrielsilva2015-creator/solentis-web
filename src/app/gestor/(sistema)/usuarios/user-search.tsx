'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function UserSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(defaultValue)

  useEffect(() => {
    // Apenas atualiza se o valor mudou
    if (searchTerm === defaultValue) return

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set('q', searchTerm)
      } else {
        params.delete('q')
      }
      params.delete('page') // Reset page on new search
      router.push(`/gestor/usuarios?${params.toString()}`)
    }, 300)

    return () => clearTimeout(handler)
  }, [searchTerm, searchParams, router, defaultValue])

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar por nome ou e-mail…"
      className="h-10 flex-1 rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  )
}
