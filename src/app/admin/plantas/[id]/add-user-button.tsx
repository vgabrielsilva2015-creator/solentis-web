'use client'

import { useActionState, useState } from 'react'
import { UserPlus, X, Copy, Check, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarUsuarioPlanta } from '../actions'
import type { UsuarioFormState } from '@/app/gestor/(sistema)/usuarios/schema'

const initialState: UsuarioFormState = {}

export function AddUserButton({
  tenantId,
  tenantName,
}: {
  tenantId: string
  tenantName: string
}) {
  const [open, setOpen] = useState(false)
  const criar = criarUsuarioPlanta.bind(null, tenantId)
  const [state, formAction, isPending] = useActionState(criar, initialState)
  const [copied, setCopied] = useState(false)

  function close() {
    if (isPending) return
    setOpen(false)
  }

  async function copiar() {
    if (!state.tempPassword) return
    try {
      await navigator.clipboard.writeText(state.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard bloqueado */
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Novo usuário
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-foreground">
                  Novo usuário — {tenantName}
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

            {/* Sucesso: mostra a senha provisória + status do convite */}
            {state.tempPassword ? (
              <div className="space-y-4">
                {state.inviteSent ? (
                  <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-400">
                    ✅ Convite enviado por e-mail para o usuário definir a própria senha.
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
                    ⚠️ Não foi possível enviar o convite por e-mail
                    {state.inviteError ? `: ${state.inviteError}` : ''}. Use a senha provisória abaixo.
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Senha provisória (repasse com segurança — <strong>não será exibida de novo</strong>):
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                  <code className="flex-1 select-all font-mono text-base text-emerald-300">{state.tempPassword}</code>
                  <Button variant="outline" size="sm" onClick={copiar} className="h-8 gap-1.5 text-xs">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button onClick={close} className="h-9 text-xs">Concluído</Button>
                </div>
              </div>
            ) : (
              /* Formulário */
              <form action={formAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">Nome</label>
                  <Input
                    id="name" name="name" type="text" placeholder="Nome completo"
                    required disabled={isPending}
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                  />
                  {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
                  <Input
                    id="email" name="email" type="email" placeholder="usuario@email.com"
                    required disabled={isPending}
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                  />
                  {state.fieldErrors?.email && <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="role" className="text-sm font-medium text-foreground">Perfil</label>
                  <select
                    id="role" name="role" required disabled={isPending} defaultValue=""
                    className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="" disabled>Selecione um perfil</option>
                    <option value="OPERATOR">Operador</option>
                    <option value="TECHNICIAN">Técnico</option>
                    <option value="MANAGER">Gestor</option>
                    <option value="MAINTENANCE">Manutenção</option>
                  </select>
                  {state.fieldErrors?.role && <p className="text-xs text-red-400">{state.fieldErrors.role[0]}</p>}
                </div>

                {state.error && (
                  <p className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {state.error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={close} disabled={isPending} className="h-9 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    type="submit" disabled={isPending}
                    className="h-9 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isPending ? 'Criando…' : 'Criar usuário'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
