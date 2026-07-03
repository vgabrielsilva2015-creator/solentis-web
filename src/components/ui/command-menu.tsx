'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, AlertTriangle, Droplet, LayoutDashboard, FileText, UploadCloud, FileCheck, Power, Wrench, MapPin, SearchCode } from 'lucide-react'

// Hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

export function CommandMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  // Toggle the menu when ⌘K is pressed
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Close the menu when navigating
  React.useEffect(() => {
    setOpen(false)
    setSearch('')
  }, [pathname])

  // Fetch search results
  React.useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setResults(data.results || [])
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [debouncedSearch])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Determine context based on URL
  const isGestor = pathname.startsWith('/gestor')
  const isTecnico = pathname.startsWith('/tecnico')
  const isOperador = pathname.startsWith('/operador')

  if (!isGestor && !isTecnico && !isOperador) return null

  const getIconForType = (type: string) => {
    if (type === 'equipment') return <Wrench className="h-4 w-4" />
    if (type === 'point') return <MapPin className="h-4 w-4" />
    if (type === 'occurrence') return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <SearchCode className="h-4 w-4" />
  }

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 pt-[20vh]"
      shouldFilter={false} // We are doing server-side filtering
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input 
            value={search}
            onValueChange={setSearch}
            placeholder="Digite um comando, equipamento, ponto ou ocorrência..." 
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-foreground">
          
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}

          {!loading && search.length >= 2 && results.length === 0 && (
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para "{search}".
            </Command.Empty>
          )}

          {!loading && results.length > 0 && (
            <Command.Group heading="Resultados da Busca" className="px-2 text-xs font-medium text-muted-foreground mb-2">
              {results.map((item) => (
                <Command.Item 
                  key={item.id} 
                  onSelect={() => runCommand(() => router.push(item.href))} 
                  className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/80 shrink-0 text-muted-foreground">
                    {getIconForType(item.type)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{item.subtitle}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {!search && (
            <>
              {isOperador && (
                <Command.Group heading="Ações de Operação" className="px-2 text-xs font-medium text-muted-foreground mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/leituras/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <Droplet className="h-4 w-4" /> Cadastrar Leitura Manual
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/turnos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <FileCheck className="h-4 w-4" /> Passagem de Turno
                  </Command.Item>
                </Command.Group>
              )}

              {isTecnico && (
                <Command.Group heading="Manutenção & Análise" className="px-2 text-xs font-medium text-muted-foreground mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/ocorrencias/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <AlertTriangle className="h-4 w-4" /> Relatar Ocorrência
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/equipamentos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <Wrench className="h-4 w-4" /> Gerir Equipamentos
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/analises/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <FileText className="h-4 w-4" /> Cadastrar Análise Laboratorial
                  </Command.Item>
                </Command.Group>
              )}

              {isGestor && (
                <Command.Group heading="Gestão Hídrica" className="px-2 text-xs font-medium text-muted-foreground mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/relatorios'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <FileText className="h-4 w-4 text-emerald-500" /> Gerar Relatório de Auditoria
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/laudos/importar'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <UploadCloud className="h-4 w-4 text-blue-500" /> Importar Laudos com IA
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/ocorrencias'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Painel de Ocorrências
                  </Command.Item>
                </Command.Group>
              )}

              <Command.Separator className="-mx-2 my-1 h-px bg-muted" />
              <Command.Group className="px-2">
                <Command.Item onSelect={() => runCommand(() => router.push('/login'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md aria-selected:bg-muted text-muted-foreground">
                  <Power className="h-4 w-4" /> Fazer Logoff
                </Command.Item>
              </Command.Group>
            </>
          )}

        </Command.List>
      </div>
    </Command.Dialog>
  )
}
