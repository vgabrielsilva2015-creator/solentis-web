'use client'

import { useState, useTransition } from 'react'
import { Power, PowerOff, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleAtivoPlanta } from '../actions'

export function TogglePlantButton({
  tenantId,
  tenantName,
  isActive,
}: {
  tenantId: string
  tenantName: string
  isActive: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function close() {
    if (pending) return
    setOpen(false)
    setTimeout(() => setError(null), 150)
  }

  function confirmar() {
    setError(null)
    startTransition(async () => {
      const res = await toggleAtivoPlanta(tenantId)
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  const desativando = isActive

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          desativando
            ? 'inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
            : 'inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
        }
      >
        {desativando ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
        {desativando ? 'Desativar planta' : 'Reativar planta'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {desativando ? (
                  <PowerOff className="h-5 w-5 text-red-400" />
                ) : (
                  <Power className="h-5 w-5 text-emerald-400" />
                )}
                <h3 className="text-sm font-bold text-foreground">
                  {desativando ? 'Desativar planta' : 'Reativar planta'}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={close}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {desativando ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Desativar a planta <span className="font-semibold text-foreground">{tenantName}</span>?
                  </p>
                  <p className="flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Todos os usuários desta planta perdem o acesso</strong> (não conseguem
                      mais logar). Os dados são preservados e você pode reativar a qualquer momento.
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Reativar a planta <span className="font-semibold text-foreground">{tenantName}</span>?
                  Os usuários ativos voltam a conseguir fazer login.
                </p>
              )}

              {error && (
                <p className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={pending} className="h-9 text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={confirmar}
                  disabled={pending}
                  className={
                    desativando
                      ? 'h-9 gap-1.5 bg-red-600 text-white hover:bg-red-500 text-xs'
                      : 'h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 text-xs'
                  }
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pending ? 'Salvando…' : desativando ? 'Desativar planta' : 'Reativar planta'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
