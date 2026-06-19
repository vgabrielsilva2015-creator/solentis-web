'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthHeader, FormError, PasswordStrength } from '@/components/auth/AuthComponents'
import { PasswordField } from '@/components/auth/PasswordField'
import { Loader2, ArrowRight } from 'lucide-react'

// Mocking some invitation data fetch based on the token
function getInviteData(token: string) {
  return {
    email: 'operador@saneamento.gov.br',
    role: 'Operador',
    facility: 'ETE Principal - Setor Norte'
  }
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  // React 19 unwraps the Promise via `use`
  const { token } = use(params)
  
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  const inviteData = getInviteData(token)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError('')

    // Mock accept invite
    setTimeout(() => {
      setIsPending(false)
      router.push('/login')
    }, 1500)
  }

  return (
    <AuthShell tagline="Bem-vindo à equipe de monitoramento.">
      <AuthHeader 
        title="Aceitar Convite" 
        subtitle={`Você foi convidado para participar do Solentis.`} 
      />

      <div className="mb-6 p-4 rounded-xl bg-surface-2 border border-border space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
          <p className="text-sm font-medium text-foreground">{inviteData.email}</p>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cargo</p>
            <p className="text-sm text-foreground">{inviteData.role}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unidade</p>
            <p className="text-sm text-foreground">{inviteData.facility}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Definir Senha"
            required
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
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
              Ingressando…
            </>
          ) : (
            <>
              Aceitar e Ingressar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}
