'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({ placeholder = 'Buscar...', debounceMs = 300, className = '' }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [isPending, setIsPending] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync with URL if it changes from outside
  useEffect(() => {
    const currentQ = searchParams.get('q') || ''
    if (currentQ !== query) {
      setQuery(currentQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery)
    setIsPending(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (newQuery.trim()) {
        params.set('q', newQuery.trim())
      } else {
        params.delete('q')
      }
      
      // Keep other params but reset pagination if it exists
      params.delete('page')
      
      router.push(`${pathname}?${params.toString()}`)
      setIsPending(false)
    }, debounceMs)
  }

  const handleClear = () => {
    handleSearch('')
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full md:w-64 lg:w-80 rounded-lg border border-border bg-surface-2 pl-9 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Limpar busca"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {isPending && (
        <div className="absolute right-8 flex items-center justify-center">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
        </div>
      )}
    </div>
  )
}
