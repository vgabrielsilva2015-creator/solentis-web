'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthHeader, AuthFooterLink, FormError, PasswordStrength } from '@/components/auth/AuthComponents'
import { PasswordField } from '@/components/auth/PasswordField'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError('')
    
    // Mock signup behavior
    setTimeout(() => {
      setIsPending(false)
      // Redirect to email verification
      router.push('/verify-email')
    }, 1500)
  }

  return (
    <AuthShell tagline="Comece a monitorar suas estações.">
      <AuthHeader title="Solicitar acesso" subtitle="Crie sua conta para testar o Solentis." />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs uppercase tracking-wider text-muted-foreground">
            Nome Completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            disabled={isPending}
            className="w-full h-11 px-3 rounded-[10px] bg-surface-2 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-foreground transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted-foreground">
            Email Corporativo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={isPending}
            className="w-full h-11 px-3 rounded-[10px] bg-surface-2 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-foreground transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Senha"
            required
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input 
            type="checkbox" 
            id="terms" 
            required
            className="mt-1 rounded border-border bg-surface-2 text-primary focus:ring-primary/40"
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
            Li e aceito os <a href="#" className="underline hover:text-foreground">Termos de Uso</a> e a <a href="#" className="underline hover:text-foreground">Política de Privacidade</a>.
          </label>
        </div>

        <FormError message={error} />

        <button
          type="submit"
          disabled={isPending}
          className="group flex w-full h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-primary-foreground font-medium transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando conta…
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8">
        <AuthFooterLink href="/login" label={<>Já tem uma conta? <strong className="font-medium text-foreground">Entrar</strong></>} />
      </div>
    </AuthShell>
  )
}
