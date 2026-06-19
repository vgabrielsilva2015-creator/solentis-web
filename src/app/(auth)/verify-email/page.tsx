'use client'

import { useState } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [isPending, setIsPending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleResend = () => {
    setIsPending(true)
    setTimeout(() => {
      setIsPending(false)
      setSent(true)
    }, 1500)
  }

  return (
    <AuthShell tagline="Falta pouco para iniciar o monitoramento.">
      <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center">
          <Mail className="w-8 h-8 text-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-display tracking-tight text-foreground">Confirme seu email</h1>
          <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            Para ativar sua conta, clique no link seguro que acabamos de enviar para você.
          </p>
        </div>

        <div className="pt-4 border-t border-border w-full">
          <p className="text-xs text-muted-foreground mb-3">Não recebeu o email?</p>
          
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-success font-medium">
              <CheckCircle2 className="w-4 h-4" /> Novo link enviado
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={isPending}
              className="h-10 px-6 inline-flex items-center justify-center gap-2 rounded-[10px] bg-surface-2 text-foreground text-sm font-medium hover:bg-surface-3 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reenviar confirmação
            </button>
          )}
        </div>

        <Link 
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-8"
        >
          Ir para o login
        </Link>
      </div>
    </AuthShell>
  )
}
