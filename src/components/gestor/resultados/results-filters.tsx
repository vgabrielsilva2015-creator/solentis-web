'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export function ResultsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentQ = searchParams.get('q') || ''
  const currentStatus = searchParams.get('status') || 'all'

  const [q, setQ] = useState(currentQ)

  const updateParams = useCallback((newQ: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newQ) params.set('q', newQ)
    else params.delete('q')

    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    else params.delete('status')

    // reseta página ao filtrar
    params.delete('page')

    router.push(`?${params.toString()}`)
  }, [searchParams, router])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams(q, currentStatus)
  }

  const handleClear = () => {
    setQ('')
    updateParams('', 'all')
  }

  const hasFilters = currentQ !== '' || currentStatus !== 'all'

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center w-full max-w-2xl">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por ponto ou parâmetro..." 
          className="pl-9 bg-background/50 border-border"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-48 shrink-0">
        <select 
          value={currentStatus} 
          onChange={(e) => updateParams(q, e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-background/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="all">Todos os Status</option>
          <option value="conforme">Conforme</option>
          <option value="fora">Fora do Limite</option>
        </select>
      </div>
      <Button type="submit" variant="secondary" className="w-full sm:w-auto shrink-0">
        Filtrar
      </Button>
      {hasFilters && (
        <Button 
          type="button" 
          variant="ghost" 
          size="icon"
          onClick={handleClear}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Limpar filtros"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </form>
  )
}
