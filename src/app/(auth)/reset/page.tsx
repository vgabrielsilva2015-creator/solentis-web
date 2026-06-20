'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthHeader, FormError, PasswordStrength } from '@/components/auth/AuthComponents'
import { PasswordField } from '@/components/auth/PasswordField'
import { ShieldCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { resetPassword } from '../actions'

function ResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (!token) {
    return (
      <AuthShell tagline="Sua segurança é prioridade.">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-alarm/5 border border-alarm/30 rounded-xl mb-4">
            <FormError message="Este link de recuperação expirou ou é inválido." />
          </div>
          <Link 
            href="/forgot"
            className="h-11 px-6 inline-flex items-center justify-center rounded-[10px] bg-surface-2 text-foreground font-medium hover:bg-surface-3 transition-colors"
          >
            Solicitar novo link
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (isSuccess) {
    return (
      <AuthShell tagline="Sua segurança é prioridade.">
        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-display tracking-tight text-foreground">Senha atualizada</h1>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o painel…
            </p>
          </div>
        </div>
      </AuthShell>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setIsPending(false)
      return
    }

    try {
      const result = await resetPassword(token as string, password)
      setIsPending(false)

      if (result.error) {
        setError(result.error)
      } else {
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setIsPending(false)
      setError('Erro ao se conectar com o servidor.')
    }
  }

  return (
    <AuthShell tagline="Sua segurança é prioridade.">
      <AuthHeader 
        title="Definir nova senha" 
        subtitle="Escolha uma senha forte. Mínimo 10 caracteres, com letra e número." 
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Nova senha"
            required
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmar senha"
          required
          disabled={isPending}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <FormError message={error} />

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-primary-foreground font-medium transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Atualizando…
            </>
          ) : (
            'Atualizar senha'
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell><div className="flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div></AuthShell>}>
      <ResetContent />
    </Suspense>
  )
}
