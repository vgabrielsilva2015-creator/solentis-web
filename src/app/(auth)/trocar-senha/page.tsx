'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trocarSenhaAction, type TrocarSenhaState } from './actions'
import { SignOutButton } from '@/components/sign-out-button'

const initialState: TrocarSenhaState = {}

const REQUIREMENTS = [
  { label: 'Mínimo 10 caracteres',  test: (v: string) => v.length >= 10 },
  { label: 'Ao menos uma letra',    test: (v: string) => /[A-Za-z]/.test(v) },
  { label: 'Ao menos um número',    test: (v: string) => /[0-9]/.test(v) },
]

export default function TrocarSenhaPage() {
  const [state, formAction, isPending] = useActionState(trocarSenhaAction, initialState)
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Solentis</h1>
        <p className="text-sm text-slate-400">Sistema de Gestão de ETE</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">Criar nova senha</h2>
          <p className="text-xs text-slate-400">
            Crie uma senha segura para continuar acessando o sistema.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Nova senha */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-300">
              Nova senha
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state.fieldErrors?.newPassword && (
              <p className="text-xs text-red-400">{state.fieldErrors.newPassword[0]}</p>
            )}
          </div>

          {/* Checklist de requisitos (aparece ao digitar) */}
          {password.length > 0 && (
            <ul className="space-y-1 pl-0.5">
              {REQUIREMENTS.map((req) => {
                const ok = req.test(password)
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-400' : 'text-slate-500'}`}
                  >
                    {ok ? <Check size={12} /> : <X size={12} />}
                    {req.label}
                  </li>
                )
              })}
            </ul>
          )}

          {/* Confirmar senha */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
              Confirmar senha
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state.fieldErrors?.confirmPassword && (
              <p className="text-xs text-red-400">{state.fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          {/* Erro geral */}
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
            {isPending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>

      <div className="flex justify-center">
        <SignOutButton />
      </div>

      <p className="text-center text-xs text-slate-600">
        Solentis © {new Date().getFullYear()}
      </p>
    </div>
  )
}
