'use client'

import { useState } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthHeader, AuthFooterLink, FormError } from '@/components/auth/AuthComponents'
import { Loader2, MailCheck, ArrowLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { sendPasswordResetLink } from '../actions'

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [magicToken, setMagicToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError('')
    
    try {
      const result = await sendPasswordResetLink(email)
      setIsPending(false)
      
      if (!result.success) {
        setError('Erro ao enviar link.')
      } else {
        setIsSuccess(true)
        if (result.token) {
          setMagicToken(result.token)
        }
      }
    } catch (err) {
      setIsPending(false)
      setError('Erro de conexão.')
    }
  }

  if (isSuccess) {
    return (
      <AuthShell tagline="Recupere o acesso em poucos minutos.">
        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-success" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display tracking-tight text-foreground">Link enviado</h1>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Enviamos as instruções para <strong className="text-foreground font-medium">{email}</strong>. Verifique sua caixa de entrada e o spam.
            </p>
          </div>

          {magicToken && (
            <div className="w-full max-w-[280px] p-4 bg-primary/10 border border-primary/20 rounded-xl flex flex-col items-center mt-4">
              <span className="text-xs text-primary font-medium uppercase tracking-wider mb-2">Ambiente de Testes</span>
              <p className="text-xs text-foreground text-center mb-4">
                Como não há provedor de email configurado, utilize o botão abaixo para prosseguir:
              </p>
              <Link
                href={`/reset?token=${magicToken}`}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-105 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                Redefinir Senha
              </Link>
            </div>
          )}

          <Link 
            href="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para entrar
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell tagline="Recupere o acesso em poucos minutos.">
      <AuthHeader 
        title="Recuperar acesso" 
        subtitle="Informe o email cadastrado. Enviaremos um link seguro válido por 60 minutos." 
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={isPending}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-11 px-3 rounded-[10px] bg-surface-2 border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 text-foreground transition-all"
          />
        </div>

        <FormError message={error} />

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-primary-foreground font-medium transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando…
            </>
          ) : (
            'Enviar link de recuperação'
          )}
        </button>
      </form>

      <div className="mt-8">
        <AuthFooterLink href="/login" label={<><span className="mr-1">←</span> Voltar para entrar</>} align="left" />
      </div>
    </AuthShell>
  )
}
