'use client'

import { useActionState, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarUsuario, toggleAtivo, resetarSenha, type UsuarioFormState } from '../actions'

type User = {
  id:                  string
  name:                string
  email:               string
  role:                string
  is_active:           boolean
  must_change_password: boolean
}

const initialState: UsuarioFormState = {}

export function EditForm({ user }: { user: User }) {
  const router = useRouter()
  const [isPendingAction, startTransition] = useTransition()

  // Formulário de edição
  const editAction = editarUsuario.bind(null, user.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  // Estado local para ações secundárias
  const [actionError, setActionError]       = useState<string | null>(null)
  const [tempPassword, setTempPassword]     = useState<string | null>(null)
  const [copiedReset, setCopiedReset]       = useState(false)
  const [isActive, setIsActive]             = useState(user.is_active)

  const isPending = isPendingForm || isPendingAction

  function handleToggleAtivo() {
    const acao = isActive ? 'desativar' : 'reativar'
    const msg  = isActive
      ? 'Tem certeza que deseja desativar este usuário? Esta ação pode ser revertida.'
      : 'Reativar este usuário?'

    if (!confirm(msg)) return

    setActionError(null)
    startTransition(async () => {
      const result = await toggleAtivo(user.id)
      if (result.error) {
        setActionError(result.error)
      } else {
        setIsActive((v) => !v)
        router.refresh()
      }
    })
  }

  function handleResetarSenha() {
    if (!confirm('Gerar nova senha provisória para este usuário? A senha atual será invalidada.')) return

    setActionError(null)
    setTempPassword(null)
    startTransition(async () => {
      const result = await resetarSenha(user.id)
      if (result.error) {
        setActionError(result.error)
      } else if (result.tempPassword) {
        setTempPassword(result.tempPassword)
      }
    })
  }

  async function handleCopyReset() {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopiedReset(true)
    setTimeout(() => setCopiedReset(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 py-3">
          <Link href="/gestor/usuarios" className="text-slate-400 hover:text-slate-200 text-sm">
            ← Usuários
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm text-slate-300">Editar</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          {isActive ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
            </span>
          )}
        </div>

        {/* Formulário de edição */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-base font-medium text-slate-200">Dados do usuário</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                defaultValue={user.name}
                required disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
              <Input
                id="email" name="email" type="email"
                defaultValue={user.email}
                required disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-slate-300">Perfil</label>
              <select
                id="role" name="role"
                defaultValue={user.role}
                required disabled={isPending}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                <option value="OPERATOR">Operador</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="MANAGER">Gestor</option>
              </select>
              {state.fieldErrors?.role && (
                <p className="text-xs text-red-400">{state.fieldErrors.role[0]}</p>
              )}
            </div>

            {state.error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending}
              className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </form>
        </div>

        {/* Senha provisória gerada pelo reset */}
        {tempPassword && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-amber-300">Nova senha provisória gerada</h3>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Envie esta senha ao usuário. Ele deverá alterá-la no próximo acesso.
              </p>
            </div>
            <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
              <code className="text-base font-mono text-amber-300 tracking-widest">{tempPassword}</code>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={handleCopyReset}
                className="text-slate-400 hover:text-slate-100 shrink-0"
              >
                {copiedReset ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>
        )}

        {/* Ações perigosas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-base font-medium text-slate-200">Ações</h2>

          {actionError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleResetarSenha}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {isPendingAction ? 'Aguarde…' : 'Resetar senha'}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleToggleAtivo}
              className={
                isActive
                  ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
                  : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'
              }
            >
              {isPendingAction ? 'Aguarde…' : isActive ? 'Desativar usuário' : 'Reativar usuário'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
