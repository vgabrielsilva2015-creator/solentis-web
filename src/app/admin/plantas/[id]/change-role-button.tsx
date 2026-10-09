'use client'

import { useState, useTransition } from 'react'
import { UserCog, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { alterarPapelUsuario } from '../actions'

const PAPEIS: { value: string; label: string }[] = [
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'TECHNICIAN', label: 'Técnico' },
  { value: 'MANAGER', label: 'Gestor' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
]

export function ChangeRoleButton({
  userId,
  userName,
  currentRole,
}: {
  userId: string
  userName: string
  currentRole: string
}) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(currentRole)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Super admin é conta de sistema: não editamos o perfil dele por aqui.
  if (currentRole === 'SUPER_ADMIN') return null

  function close() {
    if (pending) return
    setOpen(false)
    setTimeout(() => {
      setError(null)
      setRole(currentRole)
    }, 150)
  }

  function confirmar() {
    setError(null)
    startTransition(async () => {
      const res = await alterarPapelUsuario(userId, role)
      if (res.error) setError(res.error)
      else setOpen(false) // sucesso: o revalidatePath atualiza a linha
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <UserCog className="h-3.5 w-3.5" />
        Perfil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">Alterar perfil</h3>
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
              <p className="text-sm text-muted-foreground">
                Escolha o novo perfil de <span className="font-semibold text-foreground">{userName}</span>.
                O acesso às telas muda de acordo com o perfil, e as sessões abertas dele são encerradas.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="role-select" className="text-xs font-medium text-muted-foreground">
                  Perfil
                </label>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={pending}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {PAPEIS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

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
                  disabled={pending || role === currentRole}
                  className="h-9 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                >
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pending ? 'Salvando…' : 'Salvar perfil'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
