'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarUsuario, type UsuarioFormState } from '../actions'

const initialState: UsuarioFormState = {}

export default function NovoUsuarioPage() {
  const [state, formAction, isPending] = useActionState(criarUsuario, initialState)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!state.tempPassword) return
    await navigator.clipboard.writeText(state.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Sucesso: mostra a senha provisória ──────────────────────────────────
  if (state.tempPassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-100">Usuário criado</h2>
              <p className="text-xs text-slate-400">
                Anote a senha provisória abaixo e envie ao usuário.
                Ele deverá alterá-la no primeiro acesso.
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
              <code className="text-base font-mono text-amber-300 tracking-widest">
                {state.tempPassword}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-100 shrink-0"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Link href="/gestor/usuarios" className="flex-1">
                <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white">
                  Ver lista de usuários
                </Button>
              </Link>
              <Link href="/gestor/usuarios/novo" className="flex-1">
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                  Criar outro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/gestor/usuarios" className="text-slate-400 hover:text-slate-200 text-sm">
            ← Voltar
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo usuário</h2>
            <p className="text-xs text-slate-400">Uma senha provisória será gerada automaticamente.</p>
          </div>

          <form action={formAction} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                placeholder="Nome completo"
                required disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
              <Input
                id="email" name="email" type="email"
                placeholder="usuario@email.com"
                required disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Perfil */}
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-slate-300">Perfil</label>
              <select
                id="role" name="role"
                required disabled={isPending}
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                <option value="" disabled>Selecione um perfil</option>
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
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar usuário'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
