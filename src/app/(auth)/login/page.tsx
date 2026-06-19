'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo / título */}
      <div className="flex flex-col items-center space-y-4">
        <div className="mb-2">
          <Logo size="lg" />
        </div>
        <div className="text-center space-y-1 mt-2">
          <p className="text-sm text-slate-400">Sistema de Gestão de ETE</p>
        </div>
      </div>

      {/* Card do formulário */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-5">
        <h2 className="text-lg font-semibold text-slate-100">Entrar</h2>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              required
              disabled={isPending}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={isPending}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          {/* Mensagem de erro */}
          {state.error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-600">
        Solentis © {new Date().getFullYear()}
      </p>
    </div>
  )
}
