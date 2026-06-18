'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, AlertTriangle, Droplet, LayoutDashboard, FileText, UploadCloud, FileCheck, Power, Wrench } from 'lucide-react'

export function CommandMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

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
  }, [pathname])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Determine context based on URL
  const isGestor = pathname.startsWith('/gestor')
  const isTecnico = pathname.startsWith('/tecnico')
  const isOperador = pathname.startsWith('/operador')

  if (!isGestor && !isTecnico && !isOperador) return null

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 pt-[20vh]"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center border-b border-slate-800 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
          <Command.Input 
            placeholder="Digite um comando ou busque telas..." 
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-slate-200">
          <Command.Empty className="py-6 text-center text-sm text-slate-500">
            Nenhum resultado encontrado.
          </Command.Empty>

          {isOperador && (
            <Command.Group heading="Ações de Operação" className="px-2 text-xs font-medium text-slate-500 mb-2">
              <Command.Item onSelect={() => runCommand(() => router.push('/operador/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/operador/leituras/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <Droplet className="h-4 w-4" /> Cadastrar Leitura Manual
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/operador/turnos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <FileCheck className="h-4 w-4" /> Passagem de Turno
              </Command.Item>
            </Command.Group>
          )}

          {isTecnico && (
            <Command.Group heading="Manutenção & Análise" className="px-2 text-xs font-medium text-slate-500 mb-2">
              <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/ocorrencias/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <AlertTriangle className="h-4 w-4" /> Relatar Ocorrência
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/equipamentos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <Wrench className="h-4 w-4" /> Gerir Equipamentos
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/analises/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <FileText className="h-4 w-4" /> Cadastrar Análise Laboratorial
              </Command.Item>
            </Command.Group>
          )}

          {isGestor && (
            <Command.Group heading="Gestão Hídrica" className="px-2 text-xs font-medium text-slate-500 mb-2">
              <Command.Item onSelect={() => runCommand(() => router.push('/gestor/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/gestor/relatorios'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <FileText className="h-4 w-4 text-emerald-500" /> Gerar Relatório de Auditoria
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/gestor/laudos/importar'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <UploadCloud className="h-4 w-4 text-blue-500" /> Importar Laudos com IA
              </Command.Item>
              <Command.Item onSelect={() => runCommand(() => router.push('/gestor/ocorrencias'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Painel de Ocorrências
              </Command.Item>
            </Command.Group>
          )}

          <Command.Separator className="-mx-2 my-1 h-px bg-slate-800" />
          <Command.Group className="px-2">
            <Command.Item onSelect={() => runCommand(() => router.push('/login'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800 text-slate-400">
              <Power className="h-4 w-4" /> Fazer Logoff
            </Command.Item>
          </Command.Group>

        </Command.List>
      </div>
    </Command.Dialog>
  )
}
