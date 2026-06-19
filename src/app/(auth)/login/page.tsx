'use client'

import { useActionState } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthHeader, AuthFooterLink, FormError } from '@/components/auth/AuthComponents'
import { PasswordField } from '@/components/auth/PasswordField'
import { loginAction, type LoginState } from './actions'
import { ArrowRight, Loader2 } from 'lucide-react'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <AuthShell tagline="Conformidade ambiental em tempo real.">
      <AuthHeader title="Entrar" />

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            required
            disabled={isPending}
            className="w-full h-11 px-3 rounded-[10px] bg-surface-2 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-foreground placeholder:text-muted-foreground/50 transition-all"
          />
        </div>

        <PasswordField
          id="password"
          name="password"
          label="Senha"
          autoComplete="current-password"
          placeholder="Sua senha de acesso"
          required
          disabled={isPending}
        />

        <div className="flex items-center gap-2 pt-1">
          <input 
            type="checkbox" 
            id="remember" 
            name="remember" 
            className="rounded border-border bg-surface-2 text-primary focus:ring-primary/40"
          />
          <label htmlFor="remember" className="text-sm text-muted-foreground">
            Manter conectado
          </label>
        </div>

        <FormError message={state.error} />

        <button
          type="submit"
          disabled={isPending}
          className="group flex w-full h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-primary-foreground font-medium transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Entrando…
            </>
          ) : (
            <>
              Entrar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <AuthFooterLink href="/forgot" label="Esqueci minha senha" align="center" />
        <div className="h-px w-full bg-border" />
        <AuthFooterLink 
          href="/signup" 
          label={<>Não tem conta? <strong className="font-medium text-foreground">Solicitar acesso</strong></>} 
          align="center" 
        />
      </div>
    </AuthShell>
  )
}
