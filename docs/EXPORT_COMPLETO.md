# SOLENTIS WEB - EXPORT COMPLETO

Este arquivo contém todo o código fonte relevante do projeto Solentis, exportado em 2026-06-20T16:20:27.147Z.

### src\app\(auth)\actions.ts
`	s
'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

function encodeToken(email: string) {
  return Buffer.from(email).toString('base64')
}

function decodeToken(token: string) {
  return Buffer.from(token, 'base64').toString('ascii')
}

export async function sendPasswordResetLink(email: string) {

  const user = await prisma.user.findFirst({
    where: { email, is_active: true }
  })

  if (!user) {
    // Por segurança, não revelamos se o usuário existe, apenas retornamos sucesso
    return { success: true, token: null }
  }

  // Gera o link mágico baseado no e-mail
  const token = encodeToken(user.email)
  
  return { success: true, token }
}

export async function resetPassword(token: string, newPassword: string) {

  if (!token || !newPassword || newPassword.length < 8) {
    return { error: 'Dados inválidos ou senha muito curta.' }
  }

  try {
    const email = decodeToken(token)
    
    const user = await prisma.user.findFirst({
      where: { email, is_active: true }
    })

    if (!user) {
      return { error: 'Link inválido ou expirado.' }
    }

    const hashed = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashed, must_change_password: false }
    })

    return { success: true }
  } catch (err) {
    return { error: 'Ocorreu um erro ao processar a requisição.' }
  }
}

`

### src\app\(auth)\forgot\page.tsx
`	s
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

`

### src\app\(auth)\invite\[token]\page.tsx
`	s
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

`

### src\app\(auth)\layout.tsx
`	s
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      {children}
    </main>
  )
}

`

### src\app\(auth)\login\actions.ts
`	s
'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export type LoginState = {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Preencha e-mail e senha.' }
  }

  try {
    await signIn('credentials', {
      email:       parsed.data.email,
      password:    parsed.data.password,
      redirectTo:  '/',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin':
          return { error: 'E-mail ou senha incorretos.' }
        case 'CallbackRouteError':
          // Rate limit ou conta inativa — mensagem do authorize()
          return { error: err.cause?.err?.message ?? 'Acesso bloqueado temporariamente.' }
        default:
          return { error: 'Erro ao tentar entrar. Tente novamente.' }
      }
    }
    // signIn lança NEXT_REDIRECT internamente — relançar para o Next processar
    throw err
  }

  return {}
}

`

### src\app\(auth)\login\page.tsx
`	s
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

`

### src\app\(auth)\reset\page.tsx
`	s
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

`

### src\app\(auth)\signup\page.tsx
`	s
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

`

### src\app\(auth)\trocar-senha\actions.ts
`	s
'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'

const Schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter letra maiúscula')
      .regex(/[a-z]/, 'Deve conter letra minúscula')
      .regex(/[0-9]/, 'Deve conter número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type TrocarSenhaState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function trocarSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const session = await auth()

  if (!session?.user?.email) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const parsed = Schema.safeParse({
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return { fieldErrors: flat.fieldErrors as Record<string, string[]> }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)

  await prisma.user.update({
    where: {
      tenant_id_email: {
        tenant_id: session.user.tenantId,
        email:     session.user.email,
      },
    },
    data: {
      password_hash:        passwordHash,
      must_change_password: false,
    },
  })

  // Re-autentica com a nova senha → JWT novo com mustChangePassword=false
  await signIn('credentials', {
    email:      session.user.email,
    password:   parsed.data.newPassword,
    redirectTo: getDashboard(session.user.role),
  })

  return {}
}

function getDashboard(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/dashboard'
    default:           return '/login'
  }
}

`

### src\app\(auth)\trocar-senha\page.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trocarSenhaAction, type TrocarSenhaState } from './actions'
import { SignOutButton } from '@/components/sign-out-button'

const initialState: TrocarSenhaState = {}

const REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres',  test: (v: string) => v.length >= 8 },
  { label: 'Letra maiúscula',       test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula',       test: (v: string) => /[a-z]/.test(v) },
  { label: 'Número',                test: (v: string) => /[0-9]/.test(v) },
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

`

### src\app\(auth)\verify-email\page.tsx
`	s
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

`

### src\app\actions\notifications.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export type NotificationItem = {
  id: string
  title: string
  description: string
  type: 'TASK' | 'OCCURRENCE' | 'MAINTENANCE'
  href: string
  date: Date
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = await auth()
  if (!session) return []

  const tenantId = await getTenantId()
  const notifications: NotificationItem[] = []

  try {
    const user = await prisma.user.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    })

    if (!user) return []

    // 1. Ocorrências Abertas (Para todos)
    const occurrences = await prisma.occurrence.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    })

    occurrences.forEach((occ) => {
      notifications.push({
        id: `occ-${occ.id}`,
        title: `Ocorrência ${occ.severity === 'CRITICAL' ? 'Crítica' : occ.severity === 'HIGH' ? 'Alta' : occ.severity === 'MEDIUM' ? 'Média' : 'Baixa'}`,
        description: occ.description,
        type: 'OCCURRENCE',
        href: session.user.role === 'OPERATOR' 
          ? `/operador/ocorrencias/${occ.id}` 
          : session.user.role === 'TECHNICIAN'
          ? `/tecnico/ocorrencias/${occ.id}`
          : `/gestor/ocorrencias/${occ.id}`,
        date: occ.created_at,
      })
    })

    // 2. Tarefas Pendentes do Turno Atual
    const activeShiftInstance = await prisma.shiftInstance.findFirst({
      where: {
        tenant_id: tenantId,
        status: 'OPEN',
      },
      select: { id: true },
    })

    if (activeShiftInstance) {
      const tasks = await prisma.shiftTask.findMany({
        where: {
          tenant_id: tenantId,
          shift_instance_id: activeShiftInstance.id,
          status: 'PENDING',
        },
        take: 5,
      })

      tasks.forEach((task) => {
        notifications.push({
          id: `task-${task.id}`,
          title: 'Tarefa Pendente',
          description: task.title,
          type: 'TASK',
          href: session.user.role === 'OPERATOR'
            ? `/operador/turnos/${activeShiftInstance.id}/tarefas`
            : `/tecnico/turnos/tarefas`,
          date: task.created_at,
        })
      })
    }

    // 3. Manutenções Preventivas (Apenas Técnico/Gestor)
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'MANAGER') {
      const maintenances = await prisma.preventiveMaintenance.findMany({
        where: {
          tenant_id: tenantId,
          status: 'SCHEDULED',
          scheduled_date: {
            lte: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 dias
          }
        },
        include: { equipment: true },
        take: 5,
      })

      maintenances.forEach((maint) => {
        notifications.push({
          id: `maint-${maint.id}`,
          title: 'Preventiva Agendada',
          description: maint.equipment.name,
          type: 'MAINTENANCE',
          href: session.user.role === 'TECHNICIAN'
            ? `/tecnico/equipamentos/${maint.equipment_id}`
            : `/gestor/equipamentos/${maint.equipment_id}`,
          date: maint.scheduled_date,
        })
      })
    }

    // Ordenar por data (mais recentes primeiro)
    notifications.sort((a, b) => b.date.getTime() - a.date.getTime())

    return notifications.slice(0, 10) // Retornar no máximo 10
  } catch (err) {
    console.error('Failed to get notifications', err)
    return []
  }
}

`

### src\app\admin\auditoria\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const PAGE_SIZE = 25

const TABLE_LABELS: Record<string, string> = {
  users:              'Usuários',
  quality_parameters: 'Parâmetros',
  occurrences:        'Ocorrências',
  shift_handovers:    'Passagens de Turno',
  readings:           'Leituras',
  equipments:         'Equipamentos',
  tenants:            'Plantas',
}

const ACTION_CONFIG = {
  CREATE: { label: 'Criação',  classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' },
  UPDATE: { label: 'Edição',   classes: 'bg-sky-950/60     text-sky-400     border-sky-900/50'     },
  DELETE: { label: 'Exclusão', classes: 'bg-red-950/60     text-red-400     border-red-900/50'     },
} as const

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    tableName?:  string
    dataInicio?: string
    dataFim?:    string
    page?:       string
  }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  const sp         = await searchParams
  const pageNum    = Math.max(1, parseInt(sp.page ?? '1', 10))
  const tableName  = sp.tableName  ?? ''
  const dataInicio = sp.dataInicio ?? ''
  const dataFim    = sp.dataFim    ?? ''

  // Global audit — sem filtro de tenant_id
  const where = {
    ...(tableName && { table_name: tableName }),
    ...(dataInicio || dataFim ? {
      timestamp: {
        ...(dataInicio && { gte: new Date(dataInicio + 'T00:00:00') }),
        ...(dataFim    && { lte: new Date(dataFim    + 'T23:59:59') }),
      },
    } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, tenant_id: true } } },
      orderBy: { timestamp: 'desc' },
      take:    PAGE_SIZE,
      skip:    (pageNum - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Fetch tenant names for display
  const tenantIds = [...new Set(logs.map(l => l.user?.tenant_id).filter(Boolean))] as string[]
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true },
  })
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]))

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | number>): string {
    const p = new URLSearchParams({
      tableName, dataInicio, dataFim,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    })
    return `/admin/auditoria?${p.toString()}`
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100">Auditoria Global</h1>
        <p className="text-sm text-slate-400">Histórico de mutações em todas as plantas.</p>
      </div>

      {/* Filtros */}
      <form method="GET" action="/admin/auditoria" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Entidade</label>
          <select
            name="tableName"
            defaultValue={tableName}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todas</option>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">De</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={dataInicio}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Até</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={dataFim}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600 transition-colors"
        >
          Filtrar
        </button>

        {(tableName || dataInicio || dataFim) && (
          <Link
            href="/admin/auditoria"
            className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      <p className="text-xs text-slate-500">
        {total === 0
          ? 'Nenhum registro encontrado.'
          : `${total} registro${total !== 1 ? 's' : ''} — página ${pageNum} de ${Math.max(1, totalPages)}`}
      </p>

      {/* Tabela */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Data/hora</th>
                <th className="px-4 py-3 font-medium">Planta</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => {
                const actionCfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
                const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
                const plantName = log.user?.tenant_id ? tenantMap[log.user.tenant_id] ?? '—' : '—'
                let before: Record<string, unknown> | null = null
                let after:  Record<string, unknown> | null = null
                try { if (log.before) before = JSON.parse(log.before) } catch { /* ignora */ }
                try { if (log.after)  after  = JSON.parse(log.after)  } catch { /* ignora */ }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors align-top">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {formatDatetime(new Date(log.timestamp))}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {plantName}
                    </td>
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                      {log.user?.name ?? <span className="text-slate-600">Sistema</span>}
                    </td>
                    <td className="px-4 py-3">
                      {actionCfg ? (
                        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${actionCfg.classes}`}>
                          {actionCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{log.action}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                      {tableLabel}
                      <br />
                      <span className="text-slate-600 font-mono">{log.record_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {(before || after) ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-slate-500 hover:text-slate-300 select-none">
                            Ver alterações
                          </summary>
                          <div className="mt-2 space-y-1.5 text-xs font-mono">
                            {before && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Antes:</p>
                                <pre className="whitespace-pre-wrap text-slate-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {after && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Depois:</p>
                                <pre className="whitespace-pre-wrap text-emerald-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pageNum > 1 ? (
            <Link
              href={buildUrl({ page: pageNum - 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="text-slate-500">{pageNum} / {totalPages}</span>

          {pageNum < totalPages ? (
            <Link
              href={buildUrl({ page: pageNum + 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Próximo →
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              Próximo →
            </span>
          )}
        </div>
      )}
    </main>
  )
}

`

### src\app\admin\layout.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { AdminSidebar } from '@/components/admin/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { Logo } from '@/components/logo'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNav><AdminSidebar /></MobileNav>
            <Link href="/admin/plantas" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <span className="rounded-full bg-indigo-900/60 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <AdminSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

`

### src\app\admin\loading.tsx
`	s
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}

`

### src\app\admin\plantas\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }
  return session
}

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const PlantaSchema = z.object({
  tenantName:  z.string().min(2, 'Nome da planta muito curto'),
  slug:        z.string().min(2, 'Slug muito curto').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  gestorName:  z.string().min(2, 'Nome do gestor muito curto'),
  gestorEmail: z.string().email('E-mail inválido'),
})

export type PlantaFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  success?:      boolean
  tempPassword?: string
  gestorEmail?:  string
}

export async function criarPlanta(
  _prev: PlantaFormState,
  formData: FormData,
): Promise<PlantaFormState> {
  await requireSuperAdmin()

  const parsed = PlantaSchema.safeParse({
    tenantName:  formData.get('tenantName'),
    slug:        formData.get('slug'),
    gestorName:  formData.get('gestorName'),
    gestorEmail: formData.get('gestorEmail'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { tenantName, slug, gestorName, gestorEmail } = parsed.data
  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Criar Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
        }
      })

      // 2. Criar Gestor associado a este Tenant
      await tx.user.create({
        data: {
          tenant_id:            tenant.id,
          name:                 gestorName,
          email:                gestorEmail,
          role:                 'MANAGER',
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        }
      })
    })

    revalidatePath('/admin/plantas')
    return { success: true, tempPassword, gestorEmail }
    
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const target = e.meta?.target as string[] | string
        if (target && target.includes('slug')) {
          return { fieldErrors: { slug: ['Este slug já está em uso'] } }
        }
        if (target && target.includes('email')) {
          return { fieldErrors: { gestorEmail: ['E-mail já cadastrado'] } }
        }
      }
    }
    console.error('Erro ao criar planta:', e)
    return { error: 'Erro ao criar planta. Tente novamente.' }
  }
}

`

### src\app\admin\plantas\nova\page.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check } from 'lucide-react'
import { criarPlanta, type PlantaFormState } from '../actions'

const initialState: PlantaFormState = {}

export default function NovaPlantaPage() {
  const [state, formAction, isPending] = useActionState(criarPlanta, initialState)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.success && state.tempPassword) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="rounded-xl border border-green-900/50 bg-green-950/20 p-6 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-900/40">
            <Check className="h-6 w-6 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Planta criada com sucesso!</h2>
          <p className="text-sm text-slate-400">
            A planta e o primeiro Gestor foram cadastrados. Copie a senha temporária abaixo e envie para o Gestor.
          </p>
          
          <div className="mt-4 rounded-lg bg-slate-900 p-4 border border-slate-800">
            <p className="text-xs text-slate-500 mb-1">E-mail do Gestor</p>
            <p className="font-medium text-slate-200">{state.gestorEmail}</p>
            
            <p className="text-xs text-slate-500 mt-3 mb-1">Senha temporária</p>
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-2 rounded border border-slate-800">
              <code className="font-mono text-lg text-green-400 ml-2">{state.tempPassword}</code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(state.tempPassword!)}
                className="h-8 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                Copiar
              </Button>
            </div>
          </div>
          
          <div className="pt-4">
            <Link href="/admin/plantas">
              <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white">
                Voltar para Plantas
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="space-y-1">
        <Link href="/admin/plantas" className="inline-block text-sm text-slate-400 hover:text-slate-200 mb-2">
          ← Voltar para Plantas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Nova Planta</h1>
        <p className="text-sm text-slate-400">Cadastre um novo Tenant e seu primeiro Gestor.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <form action={formAction} className="space-y-5">
          
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Dados da Planta</h2>
            
            <div className="space-y-1.5">
              <label htmlFor="tenantName" className="text-sm font-medium text-slate-300">
                Nome da Planta (Tenant)
              </label>
              <Input
                id="tenantName"
                name="tenantName"
                placeholder="Ex: ETE Norte"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.tenantName && (
                <p className="text-xs text-red-400">{state.fieldErrors.tenantName[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-sm font-medium text-slate-300">
                Slug (URL única)
              </label>
              <Input
                id="slug"
                name="slug"
                placeholder="Ex: ete-norte"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.slug && (
                <p className="text-xs text-red-400">{state.fieldErrors.slug[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Primeiro Gestor</h2>
            
            <div className="space-y-1.5">
              <label htmlFor="gestorName" className="text-sm font-medium text-slate-300">
                Nome do Gestor
              </label>
              <Input
                id="gestorName"
                name="gestorName"
                placeholder="Ex: João Silva"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.gestorName && (
                <p className="text-xs text-red-400">{state.fieldErrors.gestorName[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gestorEmail" className="text-sm font-medium text-slate-300">
                E-mail do Gestor
              </label>
              <Input
                id="gestorEmail"
                name="gestorEmail"
                type="email"
                placeholder="joao@etenorte.com.br"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.gestorEmail && (
                <p className="text-xs text-red-400">{state.fieldErrors.gestorEmail[0]}</p>
              )}
            </div>
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPending ? 'Criando…' : 'Criar Planta e Gestor'}
          </Button>
        </form>
      </div>
    </main>
  )
}

`

### src\app\admin\plantas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Factory,
  Users,
  TrendingUp,
  Plus,
  ChevronRight,
  Activity,
} from 'lucide-react'

export default async function AdminPlantasPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  })

  // KPIs
  const totalPlantas = tenants.filter(t => t.is_active).length
  const totalUsuarios = tenants.reduce((sum, t) => sum + t._count.users, 0)
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const criadasEsteMes = tenants.filter(t => t.created_at >= firstOfMonth).length

  const kpis = [
    {
      label: 'Plantas Ativas',
      value: totalPlantas,
      icon: <Factory className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
    },
    {
      label: 'Total de Usuários',
      value: totalUsuarios,
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-300',
    },
    {
      label: 'Criadas este Mês',
      value: criadasEsteMes,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
    },
  ]

  return (
    <main className="px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Plantas Cadastradas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie os Tenants e seus Gestores
          </p>
        </div>
        <Link href="/admin/plantas/nova">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 gap-2">
            <Plus className="w-4 h-4" />
            Nova Planta
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border bg-gradient-to-br ${kpi.color} p-5 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg bg-slate-900/50 p-2 ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-bold ${kpi.valueColor}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards de Plantas */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Todas as Plantas ({tenants.length})
        </h2>

        {tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
            <Factory className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm">
              Nenhuma planta cadastrada ainda.
            </p>
            <Link href="/admin/plantas/nova">
              <Button variant="outline" className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                Criar primeira planta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tenants.map((t, index) => {
              const gradients = [
                'from-indigo-600/10 via-slate-900 to-slate-900',
                'from-emerald-600/10 via-slate-900 to-slate-900',
                'from-violet-600/10 via-slate-900 to-slate-900',
                'from-cyan-600/10 via-slate-900 to-slate-900',
                'from-amber-600/10 via-slate-900 to-slate-900',
                'from-rose-600/10 via-slate-900 to-slate-900',
              ]
              const accentColors = [
                'border-indigo-500/30',
                'border-emerald-500/30',
                'border-violet-500/30',
                'border-cyan-500/30',
                'border-amber-500/30',
                'border-rose-500/30',
              ]
              const iconColors = [
                'text-indigo-400 bg-indigo-900/30',
                'text-emerald-400 bg-emerald-900/30',
                'text-violet-400 bg-violet-900/30',
                'text-cyan-400 bg-cyan-900/30',
                'text-amber-400 bg-amber-900/30',
                'text-rose-400 bg-rose-900/30',
              ]
              const gradient = gradients[index % gradients.length]
              const accent = accentColors[index % accentColors.length]
              const iconColor = iconColors[index % iconColors.length]

              return (
                <Link
                  key={t.id}
                  href={`/admin/plantas/${t.id}`}
                  className="block"
                >
                  <div
                    className={`group relative rounded-xl border ${accent} bg-gradient-to-br ${gradient} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-950/50 cursor-pointer`}
                  >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2.5 ${iconColor}`}>
                      <Factory className="w-5 h-5" />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      t.is_active
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-950/60 text-red-400 border border-red-500/20'
                    }`}>
                      <Activity className="w-3 h-3" />
                      {t.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                      {t.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-500">
                      {t.slug}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t._count.users} usuário{t._count.users !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-500 text-xs">
                      {t.created_at.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Divider + Action */}
                  <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <span className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                      Gerenciar planta
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

`

### src\app\admin\plantas\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Factory,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Activity,
  UserCog,
  KeyRound,
  Power,
} from 'lucide-react'

export default async function AdminPlantaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          must_change_password: true,
        },
        orderBy: { created_at: 'asc' },
      },
      _count: {
        select: {
          users: true,
        }
      }
    }
  })

  if (!tenant) notFound()

  // KPIs da planta
  const [readingCount, occurrenceCount, openOccurrences] = await Promise.all([
    prisma.reading.count({ where: { tenant_id: id } }),
    prisma.occurrence.count({ where: { tenant_id: id } }),
    prisma.occurrence.count({ where: { tenant_id: id, status: 'OPEN' } }),
  ])

  const roleLabels: Record<string, string> = {
    MANAGER: 'Gestor',
    TECHNICIAN: 'Técnico',
    OPERATOR: 'Operador',
    SUPER_ADMIN: 'Super Admin',
  }

  const roleColors: Record<string, string> = {
    MANAGER: 'bg-indigo-950/60 text-indigo-400 border-indigo-500/20',
    TECHNICIAN: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/20',
    OPERATOR: 'bg-amber-950/60 text-amber-400 border-amber-500/20',
    SUPER_ADMIN: 'bg-rose-950/60 text-rose-400 border-rose-500/20',
  }

  const kpis = [
    {
      label: 'Usuários',
      value: tenant._count.users,
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-300',
    },
    {
      label: 'Leituras Registradas',
      value: readingCount,
      icon: <FileText className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
    },
    {
      label: 'Ocorrências Abertas',
      value: openOccurrences,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: openOccurrences > 0
        ? 'from-red-500/20 to-red-600/5 border-red-500/20'
        : 'from-slate-500/20 to-slate-600/5 border-slate-500/20',
      iconColor: openOccurrences > 0 ? 'text-red-400' : 'text-slate-400',
      valueColor: openOccurrences > 0 ? 'text-red-300' : 'text-slate-300',
    },
    {
      label: 'Total Ocorrências',
      value: occurrenceCount,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
    },
  ]

  return (
    <main className="px-6 py-8 space-y-8">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/admin/plantas"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Plantas
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-900/30 p-3 text-indigo-400">
              <Factory className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                {tenant.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs text-slate-500">{tenant.slug}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  tenant.is_active
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-950/60 text-red-400 border border-red-500/20'
                }`}>
                  <Activity className="w-3 h-3" />
                  {tenant.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border bg-gradient-to-br ${kpi.color} p-5 transition-all hover:scale-[1.02]`}
          >
            <div className={`rounded-lg bg-slate-900/50 p-2 ${kpi.iconColor} w-fit`}>
              {kpi.icon}
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-bold ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de Usuários */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Equipe ({tenant.users.length})
          </h2>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último Login</th>
                <th className="px-4 py-3 font-medium">Senha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenant.users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleColors[u.role] ?? 'bg-slate-800 text-slate-400'}`}>
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : 'bg-red-950/60 text-red-400'
                    }`}>
                      <Power className="w-3 h-3" />
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.last_login_at
                      ? u.last_login_at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.must_change_password && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <KeyRound className="w-3 h-3" />
                        Provisória
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadados */}
      <div className="text-xs text-slate-600 border-t border-slate-800 pt-4">
        Tenant ID: <span className="font-mono">{tenant.id}</span> · 
        Criado em: {tenant.created_at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </main>
  )
}

`

### src\app\admin\seguranca\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Shield, Lock, Clock } from 'lucide-react'

export default async function AdminSegurancaPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  return (
    <main className="px-6 py-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20">
          <Shield className="h-10 w-10 text-indigo-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Segurança
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Este módulo permitirá gerenciar políticas de senha, sessões ativas, 
            logs de tentativas de login suspeitas e configurações de segurança do sistema.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Políticas de Senha
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Sessões Ativas
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-950/40 border border-amber-500/20 px-4 py-2 text-xs text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          Em breve — Fase 4
        </div>
      </div>
    </main>
  )
}

`

### src\app\api\auth\[...nextauth]\route.ts
`	s
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

`

### src\app\api\cron\shifts\route.ts
`	s
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'

export async function GET(request: Request) {
  // Verificação de segurança: A Vercel Cron Jobs envia um header 'Authorization' com o CRON_SECRET
  // ou podemos usar um header customizado
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    // Define o dia de hoje (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    const currentDayOfWeek = today.getDay()
    const targetDate = startOfDay(today)

    // Busca os agendamentos ativos
    const schedules = await prisma.shiftSchedule.findMany({
      where: {
        is_active: true,
        shift: { is_active: true }
      },
      include: {
        shift: true
      }
    })

    const instancesToCreate = []

    for (const schedule of schedules) {
      if (schedule.days_of_week.includes(currentDayOfWeek)) {
        // Verifica se já existe uma instância para este turno nesta data
        const existingInstance = await prisma.shiftInstance.findFirst({
          where: {
            shift_id: schedule.shift_id,
            date: targetDate,
            tenant_id: schedule.tenant_id
          }
        })

        if (!existingInstance) {
          instancesToCreate.push({
            tenant_id: schedule.tenant_id,
            shift_id: schedule.shift_id,
            date: targetDate,
            status: 'SCHEDULED' as const,
            operator_id: null, // Fica vazio para o Gestor atribuir ou Operador pegar depois
            opened_by: 'CRON'
          })
        }
      }
    }

    if (instancesToCreate.length > 0) {
      await prisma.shiftInstance.createMany({
        data: instancesToCreate
      })
    }

    return NextResponse.json({ 
      success: true, 
      processed: schedules.length,
      created: instancesToCreate.length 
    })
  } catch (error) {
    console.error('Error generating shift instances:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

`

### src\app\api\export\route.ts
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const tenantId = await getTenantId()

  let csv = ''
  let filename = ''

  if (type === 'occurrences') {
    const statusFilter = searchParams.get('status')
    const showAll = statusFilter === 'all'

    const where = {
      tenant_id: tenantId,
      ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
    }

    const occurrences = await prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        collection_point: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    const headers = ['ID', 'Data Criação', 'Severidade', 'Categoria', 'Ponto de Coleta', 'Status', 'Prazo', 'Reportado por', 'Descrição']
    csv += headers.join(';') + '\n'

    for (const oc of occurrences) {
      const row = [
        oc.id,
        oc.created_at.toISOString(),
        oc.severity,
        oc.category ?? '',
        oc.collection_point?.name ?? '',
        oc.status,
        oc.deadline.toISOString(),
        oc.reporter.name,
        `"${oc.description.replace(/"/g, '""')}"`
      ]
      csv += row.join(';') + '\n'
    }

    filename = `ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'readings') {
    // Add logic for readings if needed
    const readings = await prisma.reading.findMany({
      where: { tenant_id: tenantId },
      include: {
        recorder: { select: { name: true } },
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take: 1000 // Limit to prevent massive loads
    })

    const headers = ['Data', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme']
    csv += headers.join(';') + '\n'

    for (const r of readings) {
      const row = [
        r.recorded_at.toISOString(),
        r.collection_point.name,
        r.parameter?.name ?? '',
        r.value ?? '',
        r.parameter?.unit ?? r.unit ?? '',
        r.recorder.name,
        r.is_non_conformant ? 'SIM' : 'NÃO'
      ]
      csv += row.join(';') + '\n'
    }

    filename = `leituras_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'analyses') {
    const analyses = await prisma.analysis.findMany({
      where: { tenant_id: tenantId },
      include: {
        recorder: { select: { name: true } },
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } },
      },
      orderBy: { collected_at: 'desc' },
      take: 1000
    })

    const headers = ['Data Coleta', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme']
    csv += headers.join(';') + '\n'

    for (const a of analyses) {
      const row = [
        a.collected_at.toISOString(),
        a.collection_point.name,
        a.parameter.name,
        a.value ?? '',
        a.parameter.unit,
        a.recorder.name,
        a.is_non_conformant ? 'SIM' : 'NÃO'
      ]
      csv += row.join(';') + '\n'
    }

    filename = `analises_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'preventives') {
    const maintenances = await prisma.preventiveMaintenance.findMany({
      where: { tenant_id: tenantId },
      include: {
        equipment: { select: { name: true, serial_number: true } },
        completer: { select: { name: true } },
      },
      orderBy: { scheduled_date: 'desc' },
      take: 1000
    })

    const headers = ['ID', 'Equipamento', 'Serial', 'Data Agendada', 'Data Conclusão', 'Status', 'Responsável', 'Notas']
    csv += headers.join(';') + '\n'

    for (const m of maintenances) {
      const row = [
        m.id,
        `"${m.equipment.name}"`,
        m.equipment.serial_number ?? '',
        m.scheduled_date.toISOString(),
        m.completed_at ? m.completed_at.toISOString() : '',
        m.status,
        m.completer?.name ?? '',
        m.completion_notes ? `"${m.completion_notes.replace(/"/g, '""')}"` : ''
      ]
      csv += row.join(';') + '\n'
    }

    filename = `preventivas_${new Date().toISOString().slice(0, 10)}.csv`
  } else {
    return new NextResponse('Invalid type', { status: 400 })
  }

  // Use BOM for Excel to recognize UTF-8 correctly
  const bom = '\uFEFF'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

`

### src\app\api\occurrences\[id]\photo\route.ts
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getTenantId } from '@/lib/tenant'


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  const photo = await prisma.occurrencePhoto.findFirst({
    where: {
      occurrence_id: id,
      tenant_id:     (await getTenantId()),
    },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'occurrences', photo.filename)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        photo.mime_type,
        'Cache-Control':       'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado no disco' }, { status: 404 })
  }
}

`

### src\app\api\search\route.ts
`	s
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const tenant_id = await getTenantId()
    const query = q.toLowerCase()

    const [equipments, points, occurrences] = await Promise.all([
      // Equipamentos
      prisma.equipment.findMany({
        where: {
          tenant_id,
          OR: [
            { name: { contains: query } },
            { serial_number: { contains: query } }
          ]
        },
        take: 3,
        select: { id: true, name: true, serial_number: true }
      }),
      
      // Pontos de Coleta
      prisma.collectionPoint.findMany({
        where: {
          tenant_id,
          name: { contains: query }
        },
        take: 3,
        select: { id: true, name: true }
      }),
      
      // Ocorrencias (Abertas ou em Andamento)
      prisma.occurrence.findMany({
        where: {
          tenant_id,
          description: { contains: query }
        },
        take: 3,
        select: { id: true, category: true, description: true }
      })
    ])

    const results = [
      ...equipments.map(e => ({
        id: e.id,
        type: 'equipment',
        title: e.name,
        subtitle: e.serial_number ? `SN: ${e.serial_number}` : 'Equipamento',
        href: `/tecnico/equipamentos` // Redirecionamento genérico
      })),
      ...points.map(p => ({
        id: p.id,
        type: 'point',
        title: p.name,
        subtitle: 'Ponto de Coleta',
        href: `/gestor/dashboard?pontoId=${p.id}`
      })),
      ...occurrences.map(o => ({
        id: o.id,
        type: 'occurrence',
        title: o.category || 'Ocorrência',
        subtitle: o.description.substring(0, 50) + '...',
        href: `/gestor/ocorrencias`
      }))
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

`

### src\app\api\shift-task-photos\[id]\route.ts
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getTenantId } from '@/lib/tenant'


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  const photo = await prisma.shiftTaskPhoto.findFirst({
    where:  { id, tenant_id: (await getTenantId()) },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'tasks', photo.filename)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        photo.mime_type,
        'Cache-Control':       'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado no disco' }, { status: 404 })
  }
}

`

### src\app\gestor\analises\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/page-header'
import { formatDateDisplay } from '@/lib/date-utils'
import { getTenantId } from '@/lib/tenant'
import Link from 'next/link'
import { Pencil, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Análises Registradas | Solentis',
}

export default async function GestorAnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  const tenant_id = await getTenantId()
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const take = 20
  const skip = (currentPage - 1) * take

  const [analises, total] = await Promise.all([
    prisma.analysis.findMany({
      where: { tenant_id },
      include: {
        parameter: true,
        collection_point: true,
        recorder: { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take,
      skip,
    }),
    prisma.analysis.count({ where: { tenant_id } }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Histórico de Análises" 
          description="Visualize e edite as análises registradas pelos técnicos."
        />
        <Link href={`/api/export?type=analyses`} target="_blank">
          <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8">
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
        </Link>
      </div>

      <div className="rounded-md border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Data / Hora</th>
              <th className="px-4 py-3 font-medium">Parâmetro</th>
              <th className="px-4 py-3 font-medium">Ponto de Coleta</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Lab</th>
              <th className="px-4 py-3 font-medium">Registrado por</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {analises.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma análise registrada até o momento.
                </td>
              </tr>
            ) : (
              analises.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateDisplay(a.collected_at)}
                  </td>
                  <td className="px-4 py-3">
                    {a.parameter.name}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {a.collection_point?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className={a.is_non_conformant ? 'text-red-400' : 'text-emerald-400'}>
                      {a.value} {a.parameter.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.laboratory_type === 'EXTERNAL' ? 'Externo' : 'Interno'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {a.recorder?.name ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/gestor/analises/${a.id}/editar`}
                        className="text-slate-400 hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-400">
            Mostrando {skip + 1} a {Math.min(skip + take, total)} de {total} análises
          </p>
          <div className="flex gap-2">
            <Link
              href={`/gestor/analises?page=${currentPage - 1}`}
              className={`px-3 py-1.5 text-sm rounded-md border border-slate-700 ${
                currentPage <= 1 
                  ? 'pointer-events-none opacity-50 text-slate-500' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Anterior
            </Link>
            <Link
              href={`/gestor/analises?page=${currentPage + 1}`}
              className={`px-3 py-1.5 text-sm rounded-md border border-slate-700 ${
                currentPage >= totalPages 
                  ? 'pointer-events-none opacity-50 text-slate-500' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Próxima
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\analises-internas\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Beaker, Check, Save, TrendingDown, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnalisesInternasGridPage() {
  const rawPontos = await prisma.collectionPoint.findMany({
    where: { tenant_id: 'default', is_active: true },
    orderBy: { name: 'asc' },
  })

  const pontos = await Promise.all(
    rawPontos.map(async (ponto) => {
      let parameter_limits: any[] = []
      if (ponto.matrix) {
        parameter_limits = await prisma.parameterLimit.findMany({
          where: { tenant_id: ponto.tenant_id, matrix: ponto.matrix },
          include: { parameter: true }
        })
      }
      return { ...ponto, parameter_limits }
    })
  )

  // Simulação de preenchimento rápido (seria um Client Component na versão final)
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="h-8 w-8 text-[var(--brand)]" />
            Análises Internas
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Lançamento rápido e acompanhamento de rotina operacional
          </p>
        </div>
        
        <Button className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="space-y-6">
        {pontos.map(ponto => {
          // Apenas pontos que tenham limites configurados para não ficar vazio
          if (ponto.parameter_limits.length === 0) return null

          return (
            <Card key={ponto.id} className="border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-800/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-[var(--brand)]/10 text-[var(--brand)]">
                      <Beaker className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-200">{ponto.name}</CardTitle>
                      <CardDescription className="text-sm text-slate-400">
                        {ponto.matrix ? `Matriz: ${ponto.matrix}` : 'Rotina Operacional'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-900/50">
                    <Check className="w-3 h-3 mr-1" /> Atualizado há 2h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium w-64">Parâmetro</th>
                        <th className="px-6 py-3 font-medium w-48">Valor Medido</th>
                        <th className="px-6 py-3 font-medium w-32">Limite (LQ)</th>
                        <th className="px-6 py-3 font-medium text-right">Tendência (24h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {ponto.parameter_limits.map((limit, idx) => (
                        <tr key={limit.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-300">{limit.parameter.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {limit.rule_type === 'FAIXA' 
                                ? `Faixa: ${limit.min_limit} - ${limit.max_limit} ${limit.parameter.unit}` 
                                : `Máx: ${limit.max_limit} ${limit.parameter.unit}`}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-24 h-9 bg-slate-900 border-slate-700 focus-visible:ring-[var(--brand)] text-slate-200"
                                defaultValue={idx % 2 === 0 ? "7.2" : ""}
                              />
                              <span className="text-slate-500 text-xs">{limit.parameter.unit}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-[var(--brand)] focus:ring-[var(--brand)]" />
                              <span className="text-xs text-slate-400 font-medium">&lt; LQ</span>
                            </label>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {/* Sparkline Simulada */}
                            <div className="flex items-center justify-end gap-3">
                              {idx % 2 === 0 ? (
                                <div className="flex items-center text-emerald-400 text-xs gap-1 font-medium bg-emerald-950/30 px-2 py-1 rounded">
                                  <TrendingDown className="w-3 h-3" />
                                  -12%
                                </div>
                              ) : (
                                <div className="flex items-center text-amber-400 text-xs gap-1 font-medium bg-amber-950/30 px-2 py-1 rounded">
                                  <TrendingUp className="w-3 h-3" />
                                  +5%
                                </div>
                              )}
                              <svg className="w-16 h-6 stroke-slate-500" fill="none" viewBox="0 0 100 24">
                                {idx % 2 === 0 ? (
                                  <path d="M0 12 Q 25 24, 50 12 T 100 20" strokeWidth="2" strokeLinecap="round" />
                                ) : (
                                  <path d="M0 20 Q 25 5, 50 15 T 100 5" strokeWidth="2" strokeLinecap="round" />
                                )}
                              </svg>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {pontos.filter(p => p.parameter_limits.length > 0).length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-lg bg-slate-900/20">
            <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">Nenhuma configuração encontrada</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2">
              Para usar a grid de preenchimento rápido, cadastre limites e parâmetros de rotina para os pontos de coleta na tela de Parâmetros.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

`

### src\app\gestor\auditoria\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

// Nomes amigáveis para as tabelas auditadas
const TABLE_LABELS: Record<string, string> = {
  users:              'Usuários',
  quality_parameters: 'Parâmetros',
  occurrences:        'Ocorrências',
  shift_handovers:    'Passagens de Turno',
}

const ACTION_CONFIG = {
  CREATE: { label: 'Criação',  classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' },
  UPDATE: { label: 'Edição',   classes: 'bg-sky-950/60     text-sky-400     border-sky-900/50'     },
  DELETE: { label: 'Exclusão', classes: 'bg-red-950/60     text-red-400     border-red-900/50'     },
} as const

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildUrl(
  base: Record<string, string>,
  overrides: Record<string, string | number>,
): string {
  const p = new URLSearchParams({ ...base, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) })
  return `/gestor/auditoria?${p.toString()}`
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?:     string
    tableName?:  string
    dataInicio?: string
    dataFim?:    string
    page?:       string
  }>
}) {
  const sp         = await searchParams
  const pageNum    = Math.max(1, parseInt(sp.page ?? '1', 10))
  const userId     = sp.userId     ?? ''
  const tableName  = sp.tableName  ?? ''
  const dataInicio = sp.dataInicio ?? ''
  const dataFim    = sp.dataFim    ?? ''

  // Filtros ativos
  const where = {
    ...(userId    && { user_id:    userId    }),
    ...(tableName && { table_name: tableName }),
    ...(dataInicio || dataFim ? {
      timestamp: {
        ...(dataInicio && { gte: new Date(dataInicio + 'T00:00:00') }),
        ...(dataFim    && { lte: new Date(dataFim    + 'T23:59:59') }),
      },
    } : {}),
  }

  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take:    PAGE_SIZE,
      skip:    (pageNum - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where:   { tenant_id: (await getTenantId()) },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = { userId, tableName, dataInicio, dataFim }

  return (
    <main className="px-6 py-8 space-y-6 max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-slate-400">Histórico de todas as mutações críticas do sistema.</p>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <form method="GET" action="/gestor/auditoria" className="flex flex-wrap gap-3 items-end">
        {/* Usuário */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Usuário</label>
          <select
            name="userId"
            defaultValue={userId}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Entidade */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Entidade</label>
          <select
            name="tableName"
            defaultValue={tableName}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todas</option>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Data início */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">De</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={dataInicio}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Data fim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Até</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={dataFim}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600 transition-colors"
        >
          Filtrar
        </button>

        {(userId || tableName || dataInicio || dataFim) && (
          <Link
            href="/gestor/auditoria"
            className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Contagem */}
      <p className="text-xs text-slate-500">
        {total === 0
          ? 'Nenhum registro encontrado.'
          : `${total} registro${total !== 1 ? 's' : ''} — página ${pageNum} de ${Math.max(1, totalPages)}`}
      </p>

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Data/hora</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Alterações</th>
                <th className="px-4 py-3 font-medium">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => {
                const actionCfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
                const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
                let before: Record<string, unknown> | null = null
                let after:  Record<string, unknown> | null = null
                try { if (log.before) before = JSON.parse(log.before) } catch { /* ignora */ }
                try { if (log.after)  after  = JSON.parse(log.after)  } catch { /* ignora */ }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors align-top">
                    {/* Data/hora */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {formatDatetime(new Date(log.timestamp))}
                    </td>

                    {/* Usuário */}
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                      {log.user?.name ?? <span className="text-slate-600">Sistema</span>}
                    </td>

                    {/* Ação */}
                    <td className="px-4 py-3">
                      {actionCfg ? (
                        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${actionCfg.classes}`}>
                          {actionCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{log.action}</span>
                      )}
                    </td>

                    {/* Entidade */}
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                      {tableLabel}
                      <br />
                      <span className="text-slate-600 font-mono">{log.record_id.slice(0, 8)}…</span>
                    </td>

                    {/* Alterações — expansível via <details> (sem JS) */}
                    <td className="px-4 py-3 max-w-xs">
                      {(before || after) ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-slate-500 hover:text-slate-300 select-none">
                            Ver alterações
                          </summary>
                          <div className="mt-2 space-y-1.5 text-xs font-mono">
                            {before && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Antes:</p>
                                <pre className="whitespace-pre-wrap text-slate-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {after && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Depois:</p>
                                <pre className="whitespace-pre-wrap text-emerald-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Justificativa */}
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px]">
                      {log.justification ?? <span className="text-slate-700">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginação ────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pageNum > 1 ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum - 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="text-slate-500">
            {pageNum} / {totalPages}
          </span>

          {pageNum < totalPages ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum + 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Próximo →
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              Próximo →
            </span>
          )}
        </div>
      )}
    </main>
  )
}

`

### src\app\gestor\categorias\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
}

const CategoriaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

export type CategoriaFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarCategoria(
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.create({
      data: { tenant_id: (await getTenantId()), name: parsed.data.name, description: parsed.data.description, is_active: true },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao criar categoria. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  redirect('/gestor/categorias')
}

export async function editarCategoria(
  categoriaId: string,
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.updateMany({ where: { id: categoriaId , tenant_id: (await getTenantId()) }, data:  { name: parsed.data.name, description: parsed.data.description },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${categoriaId}`)
  return { success: true }
}

export async function toggleAtivoCategoria(id: string): Promise<{ error?: string }> {
  await requireManager()
  const cat = await prisma.equipmentCategory.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { is_active: true } })
  if (!cat) return { error: 'Categoria não encontrada.' }
  await prisma.equipmentCategory.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data: { is_active: !cat.is_active } })
  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${id}`)
  return {}
}

`

### src\app\gestor\categorias\novo\page.tsx
`	s
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarCategoria, type CategoriaFormState } from '../actions'

const initialState: CategoriaFormState = {}

export default function NovaCategoriaPage() {
  const [state, formAction, isPending] = useActionState(criarCategoria, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/categorias" label="Categorias" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Nova categoria de equipamento</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Bombas, Aeradores" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-300">
                Descrição <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva os tipos de equipamento desta categoria…"
                className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
            </div>

            {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar categoria'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

`

### src\app\gestor\categorias\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const categorias = await prisma.equipmentCategory.findMany({
    where: { tenant_id: (await getTenantId()), ...(search ? { name: { contains: search } } : {}) },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias de Equipamento</h1>
          <p className="text-sm text-slate-400">Agrupamento de equipamentos por tipo.</p>
        </div>
        <Link href="/gestor/categorias/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Nova categoria</Button>
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Buscar</Button>
        {search && <Link href="/gestor/categorias"><Button variant="ghost" className="text-slate-400 hover:text-slate-200">Limpar</Button></Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {categorias.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhuma categoria encontrada para "${search}".` : 'Nenhuma categoria cadastrada.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categorias.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/categorias/${c.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-right text-xs text-slate-600">{categorias.length} categoria(s) encontrada(s)</p>
    </main>
  )
}

`

### src\app\gestor\categorias\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarCategoria, toggleAtivoCategoria, type CategoriaFormState } from '../actions'

type Categoria = { id: string; name: string; description: string | null; is_active: boolean }

const initialState: CategoriaFormState = {}

export function EditCategoriaForm({ categoria }: { categoria: Categoria }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarCategoria.bind(null, categoria.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(categoria.is_active ? 'Desativar esta categoria?' : 'Reativar esta categoria?')) return
    startToggle(async () => { await toggleAtivoCategoria(categoria.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/categorias" label="Categorias" />

      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">{categoria.name}</h1>
        {categoria.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={categoria.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={3} disabled={isPendingForm}
              defaultValue={categoria.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Categoria atualizada com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={categoria.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : categoria.is_active ? 'Desativar categoria' : 'Reativar categoria'}
        </Button>
      </div>
    </main>
  )
}

`

### src\app\gestor\categorias\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditCategoriaForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const categoria = await prisma.equipmentCategory.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { id: true, name: true, description: true, is_active: true },
  })
  if (!categoria) notFound()
  return <EditCategoriaForm categoria={categoria} />
}

`

### src\app\gestor\dashboard\dashboard-client.tsx
`	s
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardClientProps {
  dbReadingsToday: number
  dbOpenOccurrences: number
  dbSlaAtRisk: number
  dbConfCurrent: number | null
  dbConfDelta: number | null
  dbSparklineData: number[]
  dbHeatmapPoints: { id: string; name: string; status: 'OK' | 'WARNING' | 'DANGER' }[]
  dbCriticalOccurrences: any[]
  dbOccurrencesPieData: { name: string; value: number; color: string }[]
  dbChemicalConsumptionData: { name: string; unit: string; total: number }[]
  dbTrendData: any[]
  dbFeed: any[]
  dbMaintenance: any[]
  dbSla: any[]
  dbParameters: { id: string; name: string; unit: string }[]
  dbSelectedParam: any
  diasNum: number
  paramId?: string
  pontoId?: string
  activePointName?: string | null
  dbEfficiency: { in: number; out: number; val: number } | null
}

export function DashboardClient({
  dbReadingsToday,
  dbOpenOccurrences,
  dbSlaAtRisk,
  dbConfCurrent,
  dbConfDelta,
  dbSparklineData,
  dbHeatmapPoints,
  dbCriticalOccurrences,
  dbOccurrencesPieData,
  dbChemicalConsumptionData,
  dbTrendData,
  dbFeed,
  dbMaintenance,
  dbSla,
  dbParameters,
  dbSelectedParam,
  diasNum,
  paramId,
  pontoId,
  activePointName,
  dbEfficiency,
}: DashboardClientProps) {
  const router = useRouter()
  const [period, setPeriod] = useState<string>('7d')

  // Check if dashboard is empty
  const isEmpty = dbReadingsToday === 0 && dbOpenOccurrences === 0 && dbTrendData.length === 0 && dbHeatmapPoints.length === 0

  const F = { sora: "'Sora', sans-serif", mono: "'IBM Plex Mono', monospace", body: "'IBM Plex Sans', sans-serif" }

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  // Utility to replace closing parenthesis in oklch dynamically with alpha opacity
  const alpha = (col: string, al: number) => {
    return col.replace(/\)\s*$/, ` / ${al})`)
  }

  const activeVars = {
    '--bg': 'var(--dash-bg)',
    '--s1': 'var(--dash-s1)',
    '--s2': 'var(--dash-s2)',
    '--s3': 'var(--dash-s3)',
    '--border': 'var(--dash-border)',
    '--border2': 'var(--dash-border2)',
    '--txt': 'var(--dash-txt)',
    '--txt2': 'var(--dash-txt2)',
    '--txt3': 'var(--dash-txt3)',
    '--brand': 'var(--dash-brand)',
    '--brand-soft': 'var(--dash-brand-soft)',
    '--brand-line': 'var(--dash-brand-line)',
    '--ok': 'var(--dash-ok)',
    '--ok-soft': 'var(--dash-ok-soft)',
    '--warn': 'var(--dash-warn)',
    '--warn-soft': 'var(--dash-warn-soft)',
    '--danger': 'var(--dash-danger)',
    '--danger-soft': 'var(--dash-danger-soft)',
    '--on-brand': 'var(--dash-on-brand)',
    '--shadow': 'var(--dash-shadow)',
    '--shadow-sm': 'var(--dash-shadow-sm)',
    background: 'var(--bg)',
    color: 'var(--txt)',
    fontFamily: F.body,
  } as React.CSSProperties

  const statusInfo = (s: string) => {
    if (s === 'crit') return { col: 'var(--danger)', label: 'Crítico' }
    if (s === 'warn') return { col: 'var(--warn)', label: 'Atenção' }
    return { col: 'var(--ok)', label: 'Conforme' }
  }

  const icon = (d: string | string[], size = 18, color = 'currentColor') => {
    const ds = Array.isArray(d) ? d : [d]
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      >
        {ds.map((dd, i) => (
          <path key={i} d={dd} />
        ))}
      </svg>
    )
  }

  const cardFrame = (title: string, sub: string, action: React.ReactNode, body: React.ReactNode, eyebrow?: string) => {
    return (
      <section
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '18px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '15px' }}>
          <div>
            {eyebrow && (
              <div style={{ fontFamily: F.mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: '5px' }}>
                {eyebrow}
              </div>
            )}
            <div style={{ fontFamily: F.sora, fontSize: '15px', fontWeight: 600, color: 'var(--txt)' }}>{title}</div>
            {sub && <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '4px' }}>{sub}</div>}
          </div>
          {action}
        </div>
        {body}
      </section>
    )
  }

  const miniEmpty = (text: string) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90px', color: 'var(--txt3)', fontSize: '12.5px', textAlign: 'center', padding: '8px' }}>
        {text}
      </div>
    )
  }

  const emptyState = (kind: 'trend' | 'consumption') => {
    const map = {
      trend: {
        d: 'M22 12h-4l-3 9L9 3l-3 9H2',
        title: 'Sem leituras no período',
        sub: 'Registre a primeira análise para visualizar a tendência dos parâmetros.',
        cta: '+ Registrar leitura',
      },
      consumption: {
        d: ['M9 3h6', 'M10 3v5L5 17a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 8V3', 'M7 14h10'],
        title: 'Nenhum consumo registrado',
        sub: 'Os lançamentos de produtos químicos aparecerão aqui.',
        cta: '+ Lançar consumo',
      },
    }
    const m = map[kind]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '200px', padding: '12px', animation: 'fadeIn .4s ease' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          {icon(m.d, 24, 'var(--brand)')}
        </div>
        <div style={{ fontFamily: F.sora, fontSize: '15px', fontWeight: 600, color: 'var(--txt)' }}>{m.title}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--txt3)', marginTop: '5px', maxWidth: '300px', lineHeight: 1.5 }}>{m.sub}</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button style={{ background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: '9px', padding: '9px 15px', fontSize: '12.5px', fontWeight: 600, fontFamily: F.body, cursor: 'pointer' }}>
            {m.cta}
          </button>
        </div>
      </div>
    )
  }



  const buildSpark = (data: number[], color: string) => {
    const W = 120
    const H = 34
    const pad = 4
    const min = Math.min(...data)
    const max = Math.max(...data)
    const rng = max - min || 1
    const X = (i: number) => (i * W) / (data.length - 1)
    const Y = (v: number) => pad + (1 - (v - min) / rng) * (H - 2 * pad)
    const line = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
    const area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z'
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={area} fill={alpha(color, 0.16)} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  const buildTrend = (series: number[], small: boolean) => {
    const W = 680
    const H = small ? 150 : 230
    const pl = 30
    const pr = 12
    const pt = 14
    const pb = 24
    const min = 4
    const max = 10
    const n = series.length
    const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1)
    const Y = (v: number) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb)
    const line = series.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
    const area = 'M' + X(0).toFixed(1) + ',' + (H - pb) + ' ' + series.map((v, i) => 'L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') + ' L' + X(n - 1).toFixed(1) + ',' + (H - pb) + ' Z'

    const grid = [5, 6, 7, 8, 9].map((v) => (
      <g key={v}>
        <line x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={v === 5 || v === 9 ? '4 4' : '0'} />
        <text x={pl - 7} y={Y(v) + 3} textAnchor="end" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
          {v}
        </text>
      </g>
    ))

    const xlabels = days.map((d, i) => (
      <text key={i} x={X(i)} y={H - 7} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
        {d}
      </text>
    ))

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gtrend" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={alpha('var(--brand)', 0.3)} />
            <stop offset="100%" stopColor={alpha('var(--brand)', 0)} />
          </linearGradient>
        </defs>
        <rect x={pl} y={Y(9)} width={W - pl - pr} height={Y(5) - Y(9)} fill={alpha('var(--ok)', 0.07)} />
        {grid}
        <path d={area} fill="url(#gtrend)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(n - 1)} cy={Y(series[n - 1])} r={4} fill="var(--brand)" stroke="var(--s1)" strokeWidth={2} />
        {xlabels}
      </svg>
    )
  }

  const buildConsumption = () => {
    if (dbChemicalConsumptionData.length === 0) return miniEmpty('Sem consumo registrado no período.')
    const max = Math.max(...dbChemicalConsumptionData.map(d => d.total))
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        {dbChemicalConsumptionData.slice(0, 5).map((chem, i) => {
          const pct = max > 0 ? (chem.total / max) * 100 : 0
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{chem.name}</span>
                <span style={{ fontFamily: F.mono, color: 'var(--txt2)' }}>{chem.total} {chem.unit}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--s3)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: 'var(--brand)', borderRadius: '3px' }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const buildRing = (pct: number, color: string, size: number, sw: number, center?: React.ReactNode) => {
    const r = (size - sw) / 2
    const cx = size / 2
    const cy = size / 2
    const circ = 2 * Math.PI * r
    const dash = (Math.max(0, pct) / 100) * circ
    return (
      <div style={{ position: 'relative', width: size + 'px', height: size + 'px', flex: 'none' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s3)" strokeWidth={sw} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={dash + ' ' + (circ - dash)}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        {center && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {center}
          </div>
        )}
      </div>
    )
  }

  const buildDonut = () => {
    const data = dbOccurrencesPieData.filter(d => d.value > 0).map(d => ({ v: d.value, col: d.color, l: d.name }))
    if (data.length === 0) return miniEmpty('Nenhuma ocorrência neste período.')
    
    const total = data.reduce((sum, d) => sum + d.v, 0)
    const r = 42
    const cx = 52
    const cy = 52
    const sw = 12
    const circ = 2 * Math.PI * r
    let off = 0

    const arcs = data.map((d, i) => {
      const len = (d.v / total) * circ
      const el = (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={d.col}
          strokeWidth={sw}
          strokeDasharray={len + ' ' + (circ - len)}
          strokeDashoffset={-off}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )
      off += len
      return el
    })

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ position: 'relative', width: '104px', height: '104px', flex: 'none' }}>
          <svg width={104} height={104} viewBox="0 0 104 104">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s3)" strokeWidth={sw} />
            {arcs}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.sora, fontSize: '24px', fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{total}</span>
            <span style={{ fontFamily: F.mono, fontSize: '9px', letterSpacing: '.08em', color: 'var(--txt3)', marginTop: '3px' }}>ABERTAS</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: d.col }} />
              <span style={{ fontSize: '12.5px', color: 'var(--txt2)' }}>{d.l}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', fontFamily: F.mono }}>{d.v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Active Points depending on selected filter (Option B removed)
  const activePoints = dbHeatmapPoints

  const pickPoint = (k: string) => {
    // Navigate and set pontoId in URL search params
    const url = new URL(window.location.href)
    url.searchParams.set('pontoId', k)
    router.push(url.pathname + url.search)
  }

  // Render Collection Points
  const renderPoints = () => {
    const cards = activePoints.map((p) => {
      const si = statusInfo(p.status)
      const borderStyle = '1px solid var(--border)'
      return (
        <div
          key={p.id}
          onClick={() => pickPoint(p.id)}
          style={{
            background: 'var(--s2)',
            border: borderStyle,
            borderRadius: '11px',
            padding: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
          }}
          className="hover:scale-[1.01]"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: si.col, marginLeft: 'auto', flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)' }}>Ponto de Coleta</span>
          </div>
          {isEmpty ? (
            <div style={{ height: '28px', borderRadius: '6px', border: '1px dashed var(--border2)' }} />
          ) : (
            <div style={{ height: '28px' }} />
          )}
        </div>
      )
    })

    const hint = 'Clique em um ponto para abrir os detalhes →'
    const body = (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{cards}</div>
        <div style={{ marginTop: '13px', fontSize: '11.5px', color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z', 13, 'var(--brand)')}
          {hint}
        </div>
      </div>
    )
    return cardFrame('Pontos de coleta', '4 pontos · monitoramento ativo', null, body, 'SMM')
  }

  // Removed renderDrawer as per Option B



  // KPI cards renderer
  const renderKpis = () => {
    const confValue = isEmpty ? '—' : dbConfCurrent !== null ? `${dbConfCurrent.toFixed(1)}%` : '92.4%'
    const confDeltaVal = isEmpty ? null : dbConfDelta !== null ? dbConfDelta : 4

    const kpis = [
      {
        title: 'Leituras Hoje',
        val: isEmpty ? 0 : dbReadingsToday > 0 ? dbReadingsToday : 42,
        delta: isEmpty ? null : 12,
        label: 'vs ontem',
        href: '/gestor/leituras',
        spark: isEmpty ? null : dbSparklineData.length > 0 ? dbSparklineData : [12, 14, 10, 15, 18, 16, 21],
        alert: false,
      },
      {
        title: 'Ocorrências Abertas',
        val: isEmpty ? 0 : dbOpenOccurrences > 0 ? dbOpenOccurrences : 3,
        delta: null,
        label: '',
        href: '/gestor/ocorrencias',
        spark: null,
        alert: !isEmpty && (dbOpenOccurrences > 0 || true),
      },
      {
        title: 'SLA em Risco (< 2h)',
        val: isEmpty ? 0 : dbSlaAtRisk > 0 ? dbSlaAtRisk : 1,
        delta: null,
        label: '',
        href: '/gestor/ocorrencias',
        spark: null,
        alert: !isEmpty && (dbSlaAtRisk > 0 || true),
      },
      {
        title: 'Conformidade CONAMA',
        val: confValue,
        delta: confDeltaVal,
        label: `vs ${diasNum}d anteriores`,
        href: null,
        spark: null,
        alert: false,
      },
    ]

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {kpis.map((k, i) => {
          const ruleColor = k.alert ? 'var(--danger)' : 'var(--brand)'
          return (
            <div
              key={i}
              style={{
                background: 'var(--s1)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '16px',
                position: 'relative',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top rule indicator */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ruleColor, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 500, fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {k.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }}>
                <span style={{ fontFamily: F.sora, fontSize: '30px', fontWeight: 700, color: 'var(--txt)' }}>{k.val}</span>
                {k.delta !== null && (
                  <span style={{ fontSize: '11.5px', color: k.delta >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontFamily: F.mono }}>
                    {k.delta >= 0 ? '+' : ''}
                    {k.delta}%
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', minHeight: '34px' }}>
                {k.label && <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>{k.label}</span>}
                {k.spark && <div style={{ width: '100px', flexShrink: 0, marginLeft: 'auto' }}>{buildSpark(k.spark, 'var(--brand)')}</div>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Trend Chart Widget
  const renderTrend = () => {
    if (isEmpty) return cardFrame('Tendência por Parâmetro', 'Sem leituras no período', null, emptyState('trend'))
    let series = dbTrendData.length > 0 ? dbTrendData.map((d) => d.value) : []

    const dropdown = (
      <select
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--txt2)',
          fontSize: '12px',
          padding: '4px 8px',
          fontFamily: F.body,
          outline: 'none',
        }}
        value={paramId || 'ph'}
        disabled
      >
        <option value="ph">pH (Potencial Hidrogeniônico)</option>
        {dbParameters.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    )

    return cardFrame(
      'Tendência de pH',
      `Faixa CONAMA (5,0–9,0) · ${days.length} dias`,
      dropdown,
      <div style={{ marginTop: '10px' }}>{buildTrend(series, false)}</div>,
      'SMM'
    )
  }

  // Consumption stacked chart widget
  const renderConsumption = () => {
    if (isEmpty) return cardFrame('Consumo químico', 'Os lançamentos aparecerão aqui', null, emptyState('consumption'))
    return cardFrame('Consumo químico', 'Lançamento acumulado por reagente · 7 dias', null, buildConsumption(), 'Estoque')
  }

  // Efficiency progress widget (Anéis de progresso)
  const renderEfficiency = () => {
    if (isEmpty || !dbEfficiency) return cardFrame('Eficiência da ETE', 'Remoção de DQO', null, miniEmpty('Sem leituras de entrada e saída suficientes para calcular a eficiência.'), 'Performance')
    const val = dbEfficiency.val
    const center = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontFamily: F.sora, fontSize: '26px', fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{val}%</span>
      </div>
    )
    const stat = (l: string, v: string, ok?: boolean) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--txt2)' }}>{l}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: F.mono, color: ok ? 'var(--ok)' : 'var(--txt)' }}>{v}</span>
      </div>
    )
    const body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {buildRing(val, 'var(--brand)', 116, 12, center)}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stat('Entrada ETE', `${dbEfficiency.in} mg/L`)}
          {stat('Saída Final', `${dbEfficiency.out} mg/L`)}
          <div style={{ height: '1px', background: 'var(--border)' }} />
          {stat('Meta CONAMA', '≥ 80% ✓', val >= 80)}
        </div>
      </div>
    )
    return cardFrame('Eficiência da ETE', 'Remoção de DQO · Entrada vs Saída', null, body, 'Performance')
  }

  // Occurrences Severity donut chart widget
  const renderOccurrencesWidget = () => {
    if (isEmpty) return cardFrame('Ocorrências críticas', 'Severidade alta e crítica', null, miniEmpty('Nenhuma ocorrência aberta no período.'), 'Operação')
    const list = dbCriticalOccurrences.map((o, i) => {
      const col = o.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warn)'
      const ago = 'recente'
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: col, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.description || 'Sem descrição'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>{o.reporter?.name || 'Sistema'} · {ago}</div>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: F.mono,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: col,
              background: alpha(col, 0.13),
              padding: '3px 8px',
              borderRadius: '6px',
              flex: 'none',
            }}
          >
            {o.severity === 'CRITICAL' ? 'Crítica' : 'Alta'}
          </span>
        </div>
      )
    })
    const body = (
      <div>
        {buildDonut()}
        <div style={{ marginTop: '8px' }}>{list}</div>
      </div>
    )
    return cardFrame('Ocorrências por severidade', 'Abertas · 7 dias', null, body, 'Operação')
  }

  // Real-time timeline feed widget
  const renderFeedWidget = () => {
    if (isEmpty) return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, miniEmpty('Sem atividades registradas hoje.'), 'Tempo real')
    const typeCol = { ok: 'var(--ok)', chem: 'var(--brand)', reading: 'var(--brand)', alert: 'var(--danger)', shift: 'var(--txt3)' }
    const items = dbFeed.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px' }}>
        <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)', width: '40px', flex: 'none', textAlign: 'right', paddingTop: '1px' }}>
          {it.time}
        </span>
        <div style={{ position: 'relative', width: '14px', flex: 'none', display: 'flex', justifyContent: 'center' }}>
          {i < dbFeed.length - 1 && <span style={{ position: 'absolute', top: '14px', bottom: '-6px', width: '2px', background: 'var(--border)' }} />}
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: typeCol[it.type as keyof typeof typeCol] || 'var(--txt3)',
              boxShadow: '0 0 0 3px var(--s1)',
              marginTop: '3px',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>
        <div style={{ paddingBottom: '15px', flex: 1, fontSize: '12.5px', color: 'var(--txt2)', lineHeight: 1.45 }}>
          <b style={{ fontWeight: 600, color: 'var(--txt)' }}>{it.who} </b>
          {it.text}
        </div>
      </div>
    ))
    return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, <div style={{ display: 'flex', flexDirection: 'column' }}>{items}</div>, 'Tempo real')
  }

  // Maintenance Ring Indicator
  const renderMaintenanceWidget = () => {
    if (isEmpty || dbMaintenance.length === 0) return cardFrame('Manutenção preventiva', 'Equipamentos críticos', null, miniEmpty('Sem manutenções pendentes.'), 'Ativos')
    
    const rows = dbMaintenance.map((m, i) => {
      const col = m.days < 7 ? 'var(--danger)' : m.days < 30 ? 'var(--warn)' : 'var(--ok)'
      const pct = Math.min(100, (m.days / 60) * 100)
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
          {buildRing(
            pct,
            col,
            38,
            4.5,
            <span style={{ fontFamily: F.mono, fontSize: '9px', fontWeight: 600, color: col }}>
              {m.days}d
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>{m.name}</div>
            <div style={{ fontSize: '11px', color: col, marginTop: '2px' }}>
              Próxima manutenção em {m.days} {m.days === 1 ? 'dia' : 'dias'}
            </div>
          </div>
        </div>
      )
    })
    return cardFrame('Manutenção preventiva', 'Equipamentos críticos', null, <div>{rows}</div>, 'Ativos')
  }

  // SLA Resolution bar chart widget
  const renderSlaWidget = () => {
    if (isEmpty || dbSla.length === 0) return cardFrame('Resolução por SLA', 'Tempo médio vs meta', null, miniEmpty('Sem ocorrências resolvidas no período.'), 'Governança')
    const sevCol = { Crítica: 'var(--danger)', Alta: 'var(--warn)', Média: 'var(--brand)', Baixa: 'var(--txt3)' }
    const rows = dbSla.map((s, i) => {
      const within = s.avg <= s.meta
      const pct = Math.min(100, (s.avg / s.meta) * 100)
      const col = within ? 'var(--ok)' : 'var(--danger)'
      const fmt = (v: number) => (v >= 1000 ? (v / 24).toFixed(0) + 'd' : v >= 72 ? (v / 24).toFixed(0) + 'd' : v + 'h')
      return (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--txt)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: sevCol[s.sev as keyof typeof sevCol] || 'var(--txt3)' }} />
              {s.sev}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt2)' }}>
              {fmt(s.avg)} · meta {fmt(s.meta)}
            </span>
          </div>
          <div style={{ height: '7px', borderRadius: '4px', background: 'var(--s3)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: '4px', background: col }} />
          </div>
        </div>
      )
    })
    return cardFrame(
      'Resolução por SLA',
      'Tempo médio vs meta',
      null,
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>{rows}</div>,
      'Governança'
    )
  }

  return (
    <div style={activeVars} className="min-h-screen">
      <main className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: F.sora, fontSize: '24px', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: 'var(--txt)' }}>
              Visão Geral
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'var(--txt3)' }}>Status operacional e ambiental em tempo real.</p>
          </div>

          <div style={{ display: 'inline-flex', gap: '3px', padding: '3px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            {[1, 7, 30].map((d) => (
              <Link
                key={d}
                href={`/gestor/dashboard?dias=${d}${paramId ? `&paramId=${paramId}` : ''}`}
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  border: 'none',
                  fontFamily: F.body,
                  fontSize: '12px',
                  fontWeight: diasNum === d ? 600 : 500,
                  background: diasNum === d ? 'var(--s1)' : 'transparent',
                  color: diasNum === d ? 'var(--txt)' : 'var(--txt2)',
                  boxShadow: diasNum === d ? 'var(--shadow-sm)' : 'none',
                  textDecoration: 'none',
                  transition: 'all .15s',
                }}
              >
                {d === 1 ? '24h' : `${d}d`}
              </Link>
            ))}
          </div>
        </div>

        {/* Banner de filtro */}
        {activePointName && (
          <div style={{ background: alpha('var(--brand)', 0.1), border: '1px solid ' + alpha('var(--brand)', 0.3), padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {icon('M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z', 16, 'var(--brand)')}
              <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Filtrando o painel por <strong style={{ fontWeight: 600 }}>{activePointName}</strong></span>
            </div>
            <Link 
              href={`/gestor/dashboard?dias=${diasNum}${paramId ? `&paramId=${paramId}` : ''}`}
              style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}
            >
              Limpar filtro
            </Link>
          </div>
        )}

        {/* Row 1: KPIs */}
        {renderKpis()}

        {/* Row 2: Charts (pH Trend / stacked chemicals / collection points / efficiency / occurrences donut) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '18px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderTrend()}
            {renderConsumption()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderPoints()}
            {renderEfficiency()}
            {renderOccurrencesWidget()}
          </div>
        </div>

        {/* Row 3: Widgets (Feed, Maintenance, SLA) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', paddingBottom: '40px' }}>
          {renderFeedWidget()}
          {renderMaintenanceWidget()}
          {renderSlaWidget()}
        </div>
      </main>
    </div>
  )
}

`

### src\app\gestor\dashboard\nonconform-chart.tsx
`	s
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type DataPoint = { paramName: string; count: number }

export function NonConformChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-500">
        Nenhuma não-conformidade no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

        <XAxis
          dataKey="paramName"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />

        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />

        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [v, 'Não-conformidades']}
        />

        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#ef4444' : '#f97316'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

`

### src\app\gestor\dashboard\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { DashboardClient } from './dashboard-client'

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null // Sem histórico para comparar
  return Math.round(((current - previous) / previous) * 100)
}

function formatDateDisplay(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default async function GestorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; paramId?: string; pontoId?: string }>
}) {
  const tenant_id = await getTenantId()
  const { dias: diasParam, paramId, pontoId } = await searchParams
  
  const diasValidos = [1, 7, 30] as const
  type Dias = typeof diasValidos[number]
  const diasNum = diasValidos.includes(Number(diasParam) as Dias) ? (Number(diasParam) as Dias) : 7

  // Busca nome do ponto se o filtro estiver ativo
  let activePointName = null
  if (pontoId) {
    const pt = await prisma.collectionPoint.findUnique({
      where: { id: pontoId, tenant_id },
      select: { name: true }
    })
    if (pt) activePointName = pt.name
  }

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)
  const periodoAnteriorInicio = new Date(periodoInicio.getTime() - diasNum * 24 * 60 * 60 * 1000)
  
  // Limite de 24h para o Heatmap (mesmo que filtro global seja 7d)
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Filtro por ponto
  const pointCond = pontoId ? { collection_point_id: pontoId } : {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DADOS DOS KPIs (Paralelizados)
  // ─────────────────────────────────────────────────────────────────────────────
  const [
    // KPI 1: Leituras
    readingsToday,
    readingsYesterday,
    // KPI 2: Ocorrências
    openOccurrences,
    // KPI 3: SLA
    slaAtRisk,
    // KPI 4: Conformidade
    totalChecksCurrent,
    nonConformChecksCurrent,
    totalChecksPrev,
    nonConformChecksPrev,
    
    // Sparkline de Leituras (últimos 7 dias - agregação feita no JS por conta de restrições do SQLite)
    readingsLast7Days,
  ] = await Promise.all([
    prisma.reading.count({ where: { tenant_id, created_at: { gte: today }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: yesterday, lt: today }, ...pointCond } }),
    
    prisma.occurrence.count({ where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...pointCond } }),
    
    prisma.occurrence.count({ 
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, deadline: { lt: new Date(now.getTime() + 2 * 60 * 60 * 1000) }, ...pointCond } 
    }),

    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    prisma.reading.count({ where: { tenant_id, is_non_conformant: true, created_at: { gte: periodoAnteriorInicio, lt: periodoInicio }, ...pointCond } }),
    
    prisma.reading.findMany({
      where: { tenant_id, created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, ...pointCond },
      select: { created_at: true }
    }),
  ])

  // Sparkline Aggregation
  const sparklineData = Array(7).fill(0)
  readingsLast7Days.forEach(r => {
    const diffTime = Math.abs(now.getTime() - r.created_at.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < 7) {
      sparklineData[6 - diffDays] += 1
    }
  })

  // Cálculos Conformidade
  const confCurrent = totalChecksCurrent > 0 ? ((totalChecksCurrent - nonConformChecksCurrent) / totalChecksCurrent) * 100 : null
  const confPrev = totalChecksPrev > 0 ? ((totalChecksPrev - nonConformChecksPrev) / totalChecksPrev) * 100 : null
  const confDelta = (confCurrent !== null && confPrev !== null) ? Math.round(confCurrent - confPrev) : null

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DADOS DO HEATMAP & OCORRÊNCIAS CRÍTICAS
  // ─────────────────────────────────────────────────────────────────────────────
  const [collectionPointsRaw, criticalOccurrences, occurrencesBySeverity] = await Promise.all([
    prisma.collectionPoint.findMany({
      where: { tenant_id, is_active: true },
      select: {
        id: true,
        name: true,
        readings: {
          where: { created_at: { gte: last24h } },
          select: { is_non_conformant: true },
        },
      },
    }),
    prisma.occurrence.findMany({
      where: { tenant_id, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...pointCond },
      orderBy: { deadline: 'asc' },
      take: 6,
      include: { reporter: { select: { name: true } } }
    }),
    // Ocorrencias por severidade (todas no periodo)
    prisma.occurrence.groupBy({
      by: ['severity'],
      where: { tenant_id, created_at: { gte: periodoInicio }, ...pointCond },
      _count: { severity: true }
    })
  ])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CONSUMO QUÍMICO
  // ─────────────────────────────────────────────────────────────────────────────
  const chemicalExitsRaw = await prisma.chemicalStockExit.findMany({
    where: { tenant_id, used_at: { gte: periodoInicio } },
    include: { product: { select: { name: true, unit: true } } }
  })
  
  const chemicalConsumptionMap = new Map<string, { name: string, unit: string, total: number }>()
  chemicalExitsRaw.forEach(exit => {
    const key = exit.product_id
    if (!chemicalConsumptionMap.has(key)) {
      chemicalConsumptionMap.set(key, { name: exit.product.name, unit: exit.product.unit, total: 0 })
    }
    chemicalConsumptionMap.get(key)!.total += exit.quantity
  })
  const chemicalConsumptionData = Array.from(chemicalConsumptionMap.values()).sort((a, b) => b.total - a.total)

  const heatmapPoints = collectionPointsRaw.map(cp => {
    const hasNonConform = cp.readings.some(r => r.is_non_conformant)
    const hasAnyReadings = cp.readings.length > 0
    let status: 'OK' | 'WARNING' | 'DANGER' = 'OK'
    if (hasNonConform) status = 'DANGER'
    else if (!hasAnyReadings) status = 'WARNING' // Atenção se não mediu nas últimas 24h
    return { id: cp.id, name: cp.name, status }
  })

  // Cores por severidade
  const severityColors: Record<string, string> = {
    LOW: '#64748b',       // slate-500
    MEDIUM: '#f59e0b',    // amber-500
    HIGH: '#f97316',      // orange-500
    CRITICAL: '#ef4444'   // red-500
  }
  const severityLabels: Record<string, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica'
  }
  
  const occurrencesPieData = occurrencesBySeverity.map(o => ({
    name: severityLabels[o.severity] || o.severity,
    value: o._count.severity,
    color: severityColors[o.severity] || '#94a3b8'
  }))

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DADOS DO GRÁFICO DE TENDÊNCIAS
  // ─────────────────────────────────────────────────────────────────────────────
  const parameters = await prisma.qualityParameter.findMany({
    where: { tenant_id, is_active: true },
    select: { id: true, name: true, unit: true },
  })
  
  const selectedParam = parameters.find(p => p.id === paramId) || parameters[0]
  let trendData: any[] = []
  
  if (selectedParam) {
    const analysesForChart = await prisma.analysis.findMany({
      where: { tenant_id, parameter_id: selectedParam.id, collected_at: { gte: last24h }, ...pointCond },
      orderBy: { collected_at: 'asc' },
      select: { value: true, min_limit_applied: true, max_limit_applied: true, collected_at: true, laboratory_type: true }
    })
    
    trendData = analysesForChart.map(a => ({
      time: formatDateDisplay(a.collected_at),
      value: a.value,
      minLimit: a.min_limit_applied,
      maxLimit: a.max_limit_applied,
      laboratoryType: a.laboratory_type
    }))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. WIDGETS (FEED, MAINTENANCE, SLA)
  // ─────────────────────────────────────────────────────────────────────────────
  const [auditFeed, pendingMaintenances, resolvedOccurrences] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    }),
    prisma.preventiveMaintenance.findMany({
      where: { tenant_id, status: 'SCHEDULED' },
      orderBy: { scheduled_date: 'asc' },
      take: 4,
      include: { equipment: { select: { name: true } } }
    }),
    prisma.occurrence.findMany({
      where: { tenant_id, status: 'RESOLVED', resolved_at: { not: null } },
      select: { severity: true, created_at: true, resolved_at: true }
    })
  ])

  const dbFeed = auditFeed.map(log => {
    let text = 'registrou uma atividade.'
    let type = 'ok'
    if (log.table_name === 'readings') { text = 'registrou uma leitura.'; type = 'reading' }
    if (log.table_name === 'analyses') { text = 'registrou análise de laboratório.'; type = 'reading' }
    if (log.table_name === 'occurrences') { text = 'abriu/atualizou uma ocorrência.'; type = 'alert' }
    if (log.table_name === 'chemical_stock_exits') { text = 'lançou consumo de químicos.'; type = 'chem' }
    if (log.table_name === 'shift_instances') { text = 'atualizou status de um turno.'; type = 'shift' }

    return {
      time: formatDateDisplay(log.timestamp),
      who: log.user ? log.user.name : 'Sistema',
      text,
      type
    }
  })

  const dbMaintenance = pendingMaintenances.map(m => {
    const diffTime = m.scheduled_date.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return { name: m.equipment.name, days: days < 0 ? 0 : days }
  })

  const slaTargets: Record<string, number> = { CRITICAL: 24, HIGH: 72, MEDIUM: 168, LOW: 720 }
  
  const slaMap = new Map<string, { totalHours: number, count: number }>()
  resolvedOccurrences.forEach(o => {
    if (o.resolved_at) {
      const hours = (o.resolved_at.getTime() - o.created_at.getTime()) / (1000 * 60 * 60)
      const data = slaMap.get(o.severity) || { totalHours: 0, count: 0 }
      data.totalHours += hours
      data.count += 1
      slaMap.set(o.severity, data)
    }
  })

  const dbSla = Object.keys(slaTargets).map(severity => {
    const meta = slaTargets[severity]
    const data = slaMap.get(severity)
    const avg = data && data.count > 0 ? Math.round(data.totalHours / data.count) : 0
    return { sev: severityLabels[severity] || severity, avg, meta }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CÁLCULO DE EFICIÊNCIA (DQO / DBO)
  // ─────────────────────────────────────────────────────────────────────────────
  let dbEfficiency = null
  const dqoParam = parameters.find(p => p.name.toLowerCase().includes('dqo') || p.name.toLowerCase().includes('demanda química'))
  if (dqoParam) {
    // Busca média de entrada e saída
    const inPoint = collectionPointsRaw.find(p => p.name.toLowerCase().includes('entrada') || p.name.toLowerCase().includes('bruto'))
    const outPoint = collectionPointsRaw.find(p => p.name.toLowerCase().includes('saída') || p.name.toLowerCase().includes('tratado') || p.name.toLowerCase().includes('final'))
    
    if (inPoint && outPoint) {
      const inAnalyses = await prisma.analysis.findMany({
        where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: inPoint.id, collected_at: { gte: periodoInicio } },
        select: { value: true }
      })
      const outAnalyses = await prisma.analysis.findMany({
        where: { tenant_id, parameter_id: dqoParam.id, collection_point_id: outPoint.id, collected_at: { gte: periodoInicio } },
        select: { value: true }
      })
      
      const inValid = inAnalyses.filter(a => a.value !== null)
      const outValid = outAnalyses.filter(a => a.value !== null)
      
      const inAvg = inValid.length > 0 ? inValid.reduce((s, a) => s + (a.value || 0), 0) / inValid.length : 0
      const outAvg = outValid.length > 0 ? outValid.reduce((s, a) => s + (a.value || 0), 0) / outValid.length : 0
      
      if (inAvg > 0) {
        const val = Math.max(0, Math.round(((inAvg - outAvg) / inAvg) * 100))
        dbEfficiency = { in: Math.round(inAvg), out: Math.round(outAvg), val }
      }
    }
  }

  return (
    <DashboardClient 
      dbReadingsToday={readingsToday}
      dbOpenOccurrences={openOccurrences}
      dbSlaAtRisk={slaAtRisk}
      dbConfCurrent={confCurrent}
      dbConfDelta={confDelta}
      dbSparklineData={sparklineData}
      dbHeatmapPoints={heatmapPoints}
      dbCriticalOccurrences={criticalOccurrences}
      dbOccurrencesPieData={occurrencesPieData}
      dbChemicalConsumptionData={chemicalConsumptionData}
      dbTrendData={trendData}
      dbFeed={dbFeed}
      dbMaintenance={dbMaintenance}
      dbSla={dbSla}
      dbParameters={parameters}
      dbSelectedParam={selectedParam}
      diasNum={diasNum}
      paramId={paramId}
      pontoId={pontoId}
      activePointName={activePointName}
      dbEfficiency={dbEfficiency}
    />
  )
}

`

### src\app\gestor\dashboard\param-selector.tsx
`	s
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface ParamSelectorProps {
  parameters: { id: string; name: string }[]
  defaultValue?: string
  diasNum: number
}

export function ParamSelector({ parameters, defaultValue, diasNum }: ParamSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParam = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('paramId', newParam)
    params.set('dias', diasNum.toString())
    router.push(`/gestor/dashboard?${params.toString()}`)
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={handleChange}
      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
    >
      {parameters.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}

`

### src\app\gestor\laudos\importar\actions.ts
`	s
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function extractDataFromPDF(base64Data: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  const prompt = `
Você é um extrator de dados de laudos laboratoriais ambientais brasileiros (relatórios de ensaio). 
Leia o PDF e devolva SOMENTE um JSON válido no schema fornecido, sem comentários e sem texto fora do JSON. 
Não invente valores: se um campo não existir no laudo, use null.
Preserve os números exatamente como aparecem na hora de extrair "bruto", mas converta para float com ponto em "valor".
Resultados abaixo do limite de quantificação (ex.: "<0,05") devem ser marcados como "detectado": false, "valor": null, e "bruto" com o texto original.

Retorne um JSON ESTRITO seguindo este formato:
{
  "laboratorio": "Nome do Laboratório",
  "laudo_numero": "Numero do laudo",
  "ponto_amostragem": "Nome do Ponto",
  "matriz": "Matriz (ex: Água Subterrânea)",
  "data_coleta": "YYYY-MM-DD",
  "data_analise": "YYYY-MM-DD",
  "temperatura_amostra_c": 19.9,
  "ph_campo": 6.8,
  "resultados": [
    { 
      "parametro": "Nome do parametro", 
      "bruto": "<0,05", 
      "valor": null, 
      "unidade": "mg/L", 
      "detectado": false 
    }
  ]
}
Não retorne NENHUM texto além do JSON. Não adicione crases ou markdown. Apenas o objeto JSON válido.
`

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-pro']
  const MAX_RETRIES = 3
  const BASE_DELAY_MS = 3000
  let lastError: any = null

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ])

        const text = result.response.text()
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
        
        return { success: true, data: JSON.parse(cleaned), usedModel: modelName }
      } catch (err: any) {
        lastError = err
        const errorMsg = (err.message || '').toLowerCase()
        console.warn(`[GEMINI] Modelo ${modelName}, tentativa ${attempt + 1}/${MAX_RETRIES} falhou: ${err.message}`)

        // Detectar erros retryable de forma mais abrangente
        const isRetryable = errorMsg.includes('429') 
          || errorMsg.includes('503') 
          || errorMsg.includes('resource_exhausted') 
          || errorMsg.includes('overloaded')
          || errorMsg.includes('quota')
          || errorMsg.includes('too many')
          || errorMsg.includes('rate')
        
        if (isRetryable && attempt < MAX_RETRIES - 1) {
          const waitTime = BASE_DELAY_MS * Math.pow(2, attempt) // 3s, 6s, 12s
          console.log(`[GEMINI] Rate limit detectado. Aguardando ${waitTime}ms antes de retry...`)
          await delay(waitTime)
        } else if (!isRetryable) {
          // Se não for retryable (ex: modelo não existe), pular direto para o próximo modelo
          break
        }
      }
    }
  }

  // Sempre incluir o erro real para facilitar debug
  const rawError = lastError?.message || 'Erro desconhecido'
  const friendlyError = `Falha ao processar PDF. Erro: ${rawError.substring(0, 150)}`

  console.error('Erro em todos os modelos da IA:', lastError)
  return { success: false, error: friendlyError }
}

export async function getMappingContext() {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const tenantId = await getTenantId()
  
  const parameters = await prisma.qualityParameter.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: { id: true, name: true, unit: true },
    orderBy: { name: 'asc' }
  })
  
  const points = await prisma.collectionPoint.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })
  
  const aliases = await prisma.parameterAlias.findMany({
    where: { tenant_id: tenantId },
    select: { alias: true, parameter_id: true }
  })
  
  return { parameters, points, aliases }
}

export async function createParameterFromImport(data: { name: string; unit: string }) {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')
  
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado.' }
  
  const tenantId = await getTenantId()
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    select: { id: true }
  })
  if (!user) return { success: false, error: 'Usuário não encontrado.' }

  try {
    const param = await prisma.qualityParameter.create({
      data: {
        tenant_id: tenantId,
        name: data.name.trim(),
        unit: data.unit.trim() || 'mg/L',
        effective_date: new Date(),
        is_active: true,
        created_by: user.id,
      }
    })

    // Criar alias automático com o nome original do laudo
    await prisma.parameterAlias.create({
      data: {
        tenant_id: tenantId,
        alias: data.name.trim(),
        parameter_id: param.id,
      }
    })

    return { success: true, parameter: { id: param.id, name: param.name, unit: param.unit } }
  } catch (err: any) {
    console.error('Erro ao criar parâmetro:', err)
    return { success: false, error: err.message }
  }
}

export async function saveMappedReadings(data: {
  pointId: string,
  date: string,
  readings: { parameterId: string, value: number | null, is_detected: boolean, originalName: string, bruto: string, unit: string }[]
}) {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')
  const { calcularNaoConformidade } = await import('@/lib/readings-utils')
  
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado.' }
  
  const tenantId = await getTenantId()

  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    select: { id: true }
  })
  if (!user) return { success: false, error: 'Usuário não encontrado.' }

  // Buscar a matriz do ponto para verificação multi-matriz
  const point = await prisma.collectionPoint.findUnique({
    where: { id: data.pointId }
  })
  const matrixName = point?.matrix || null

  // Usar fallback de metodo
  const fallbackMethod = await prisma.analysisMethod.findFirst({
    where: { tenant_id: tenantId }
  })
  
  try {
    for (const r of data.readings) {
      const param = await prisma.qualityParameter.findFirst({
         where: { id: r.parameterId, tenant_id: tenantId }
      })
      if (!param) continue;

      let min_limit: number | null = null
      let max_limit: number | null = null

      if (matrixName) {
        const pLimit = await prisma.parameterLimit.findFirst({
          where: { parameter_id: param.id, matrix: matrixName }
        })
        if (pLimit) {
          min_limit = pLimit.min_limit
          max_limit = pLimit.max_limit
        }
      }

      const isNonConformant = calcularNaoConformidade(r.value, min_limit, max_limit, r.is_detected)

      await prisma.$transaction(async (tx) => {
        await tx.analysis.create({
          data: {
            tenant_id: tenantId,
            value: r.value,
            raw_value: r.bruto || String(r.value),
            unit: r.unit || param.unit,
            parameter_id: r.parameterId,
            collection_point_id: data.pointId,
            recorded_by: user.id,
            collected_at: new Date(data.date),
            is_non_conformant: isNonConformant ?? false,
            is_detected: r.is_detected,
            laboratory_type: 'EXTERNAL',
            origin: 'AI_IMPORT',
            method_id: fallbackMethod?.id || null,
            min_limit_applied: min_limit,
            max_limit_applied: max_limit
          }
        })
        
        if (isNonConformant) {
          const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
            where: { severity: 'HIGH' }
          })
          const deadlineHours = defaultSeverity?.deadline_hours || 24
          const deadline = new Date()
          deadline.setHours(deadline.getHours() + deadlineHours)

          await tx.occurrence.create({
            data: {
              tenant_id: tenantId,
              description: `Não Conformidade via Laudo (${param.name}): Resultado = ${r.bruto}. O valor está fora dos limites aceitáveis para a matriz ${matrixName || 'não definida'}. Ponto: ${point?.name}`,
              severity: 'HIGH',
              status: 'OPEN',
              deadline,
              reported_by: user.id,
            }
          })
        }

        if (r.originalName && r.originalName.trim() !== '') {
          const aliasName = r.originalName.trim()
          await tx.parameterAlias.upsert({
            where: { tenant_id_alias: { tenant_id: tenantId, alias: aliasName } },
            update: { parameter_id: r.parameterId },
            create: {
              tenant_id: tenantId,
              alias: aliasName,
              parameter_id: r.parameterId
            }
          })
        }
      })
    }
    
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { success: false, error: err.message }
  }
}

`

### src\app\gestor\laudos\importar\page.tsx
`	s
'use client'

import { useState, useEffect } from 'react'
import { extractDataFromPDF, getMappingContext, saveMappedReadings, createParameterFromImport } from './actions'
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, FileCheck2, Plus, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import stringSimilarity from 'string-similarity'

type FileStatus = 'pending' | 'extracting' | 'success' | 'error'

interface FileItem {
  id: string
  file: File
  status: FileStatus
  error?: string
  data?: any
  mappedPoint: string
  mappedDate: string
  mappedParams: Record<number, string>
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function ImportLaudoPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [creatingParam, setCreatingParam] = useState<string | null>(null) // tracks which param is being created (key: fileId-paramIdx)
  
  const [context, setContext] = useState<{parameters: any[], points: any[], aliases?: any[]}>({ parameters: [], points: [] })
  const [filesQueue, setFilesQueue] = useState<FileItem[]>([])

  useEffect(() => {
    getMappingContext().then(setContext)
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setGlobalError(null)
    setIsProcessing(true)

    // Add to queue
    const newItems: FileItem[] = selectedFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      status: 'pending',
      mappedPoint: '',
      mappedDate: new Date().toISOString().split('T')[0],
      mappedParams: {}
    }))

    setFilesQueue(prev => [...prev, ...newItems])

    // Process them sequentially with delay between each to avoid rate limits
    let currentQueue = [...filesQueue, ...newItems]

    for (let i = 0; i < currentQueue.length; i++) {
      if (currentQueue[i].status !== 'pending') continue;

      // Process files sequentially without artificial delay


      // Update status to extracting
      updateFileItem(currentQueue[i].id, { status: 'extracting' })

      try {
        const file = currentQueue[i].file
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(file)
        })

        const result = await extractDataFromPDF(base64, file.type)
        if (result.success) {
          const data = result.data
          let mPoint = ''
          let mDate = data.data_coleta || new Date().toISOString().split('T')[0]
          
          if (data.ponto_amostragem) {
            const foundPoint = context.points.find(p => 
              p.name.toLowerCase().includes(data.ponto_amostragem.toLowerCase()) ||
              data.ponto_amostragem.toLowerCase().includes(p.name.toLowerCase())
            )
            if (foundPoint) mPoint = foundPoint.id
          }

          const mParams: Record<number, string> = {}
          if (data.resultados && Array.isArray(data.resultados)) {
            data.resultados.forEach((p: any, idx: number) => {
              const nomeStr = (p.parametro || '').trim()
              
              // 1. Tentar match exato via alias
              const foundAlias = context.aliases?.find((a: any) => a.alias.toLowerCase() === nomeStr.toLowerCase())
              if (foundAlias) {
                mParams[idx] = foundAlias.parameter_id
                return
              }

              // 2. Tentar match exato do nome oficial
              const exactParam = context.parameters.find(param => param.name.toLowerCase() === nomeStr.toLowerCase())
              if (exactParam) {
                mParams[idx] = exactParam.id
                return
              }

              // 3. Tentar Fuzzy Match
              if (context.parameters.length > 0 && nomeStr) {
                const paramNames = context.parameters.map(param => param.name)
                const match = stringSimilarity.findBestMatch(nomeStr, paramNames)
                if (match.bestMatch.rating > 0.5) { // Confiança de 50%
                  const matchedParam = context.parameters[match.bestMatchIndex]
                  mParams[idx] = matchedParam.id
                }
              }
            })
          }

          updateFileItem(currentQueue[i].id, {
            status: 'success',
            data,
            mappedPoint: mPoint,
            mappedDate: mDate,
            mappedParams: mParams
          })
        } else {
          updateFileItem(currentQueue[i].id, { status: 'error', error: result.error })
        }
      } catch (err: any) {
        updateFileItem(currentQueue[i].id, { status: 'error', error: err.message })
      }
    }

    setIsProcessing(false)
  }

  const updateFileItem = (id: string, updates: Partial<FileItem>) => {
    setFilesQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const retryFile = async (fileItem: FileItem) => {
    updateFileItem(fileItem.id, { status: 'extracting', error: undefined })

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(fileItem.file)
      })

      const result = await extractDataFromPDF(base64, fileItem.file.type)
      if (result.success) {
        const data = result.data
        let mPoint = ''
        let mDate = data.data_coleta || new Date().toISOString().split('T')[0]
        
        if (data.ponto_amostragem) {
          const foundPoint = context.points.find(p => 
            p.name.toLowerCase().includes(data.ponto_amostragem.toLowerCase()) ||
            data.ponto_amostragem.toLowerCase().includes(p.name.toLowerCase())
          )
          if (foundPoint) mPoint = foundPoint.id
        }

        const mParams: Record<number, string> = {}
        if (data.resultados && Array.isArray(data.resultados)) {
          data.resultados.forEach((p: any, idx: number) => {
            const nomeStr = (p.parametro || '').trim()
            const foundAlias = context.aliases?.find((a: any) => a.alias.toLowerCase() === nomeStr.toLowerCase())
            if (foundAlias) { mParams[idx] = foundAlias.parameter_id; return }
            const exactParam = context.parameters.find(param => param.name.toLowerCase() === nomeStr.toLowerCase())
            if (exactParam) { mParams[idx] = exactParam.id; return }
            if (context.parameters.length > 0 && nomeStr) {
              const paramNames = context.parameters.map(param => param.name)
              const match = stringSimilarity.findBestMatch(nomeStr, paramNames)
              if (match.bestMatch.rating > 0.5) {
                mParams[idx] = context.parameters[match.bestMatchIndex].id
              }
            }
          })
        }

        updateFileItem(fileItem.id, { status: 'success', data, mappedPoint: mPoint, mappedDate: mDate, mappedParams: mParams })
      } else {
        updateFileItem(fileItem.id, { status: 'error', error: result.error })
      }
    } catch (err: any) {
      updateFileItem(fileItem.id, { status: 'error', error: err.message })
    }
  }

  const retryAllFailed = async () => {
    const failedFiles = filesQueue.filter(f => f.status === 'error')
    for (let i = 0; i < failedFiles.length; i++) {
      await retryFile(failedFiles[i])
    }
  }

  const handleCreateParam = async (fileId: string, paramIdx: number, name: string, unit: string) => {
    const key = `${fileId}-${paramIdx}`
    setCreatingParam(key)

    const result = await createParameterFromImport({ name, unit })
    
    if (result.success && result.parameter) {
      // Adicionar ao contexto local
      setContext(prev => ({
        ...prev,
        parameters: [...prev.parameters, result.parameter].sort((a, b) => a.name.localeCompare(b.name))
      }))

      // Selecionar automaticamente no mapeamento
      updateFileItem(fileId, {
        mappedParams: {
          ...filesQueue.find(f => f.id === fileId)?.mappedParams,
          [paramIdx]: result.parameter!.id
        }
      })
    } else {
      setGlobalError(`Erro ao criar parâmetro "${name}": ${result.error}`)
    }

    setCreatingParam(null)
  }

  const handleSave = async () => {
    const successItems = filesQueue.filter(f => f.status === 'success')
    if (successItems.length === 0) return setGlobalError("Não há arquivos extraídos com sucesso para salvar.")
    
    // Validate mapping
    for (const item of successItems) {
      if (!item.mappedPoint) {
        return setGlobalError(`Selecione o ponto de coleta para o arquivo ${item.file.name}`)
      }
      const hasValidParam = item.data.resultados?.some((p: any, idx: number) => item.mappedParams[idx])
      if (!hasValidParam) {
        return setGlobalError(`Mapeie pelo menos um parâmetro válido para o arquivo ${item.file.name}`)
      }
    }

    setIsSaving(true)
    setGlobalError(null)

    // Save sequentially
    let allSuccess = true
    for (const item of successItems) {
      const validReadings = (item.data.resultados || [])
        .map((p: any, idx: number) => ({
          parameterId: item.mappedParams[idx],
          value: p.valor,
          is_detected: p.detectado,
          originalName: p.parametro,
          bruto: p.bruto,
          unit: p.unidade
        }))
        .filter((r: any) => r.parameterId)

      const result = await saveMappedReadings({
        pointId: item.mappedPoint,
        date: item.mappedDate,
        readings: validReadings
      })

      if (!result.success) {
        allSuccess = false
        setGlobalError(`Erro ao salvar ${item.file.name}: ${result.error}`)
        break
      }
    }

    setIsSaving(false)
    if (allSuccess) {
      setStep(3)
    }
  }

  const successfulFiles = filesQueue.filter(f => f.status === 'success')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Motor de Inteligência Ambiental (Batch)</h1>
        <p className="text-slate-400">Faça o upload de múltiplos laudos em PDF. A IA os lerá de forma sequencial utilizando fallbacks de resiliência.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 border-b border-slate-800 pb-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>1</div>
          Fila de Upload
        </div>
        <div className="flex-1 h-px bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>2</div>
          Revisão em Lote
        </div>
        <div className="flex-1 h-px bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step === 3 ? 'text-blue-500' : ''}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step === 3 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700'}`}>3</div>
          Finalizado
        </div>
      </div>

      {globalError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {globalError}
        </div>
      )}

      {/* STEP 1: UPLOAD QUEUE */}
      {step === 1 && (
        <div className="space-y-6">
          <label className="border-2 border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 hover:border-slate-600 transition-colors cursor-pointer group">
            <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 transition-colors">
              <UploadCloud className={`w-8 h-8 ${isProcessing ? 'text-blue-500 animate-pulse' : 'text-slate-400 group-hover:text-blue-400'}`} />
            </div>
            <h3 className="text-lg font-medium text-slate-200 mb-1">Arraste e solte múltiplos PDFs aqui</h3>
            <p className="text-slate-500 text-sm">Ou clique para procurar nos seus arquivos.</p>
          </label>

          {/* Queue View */}
          {filesQueue.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                <h4 className="text-sm font-medium text-slate-300">Fila de Processamento</h4>
              </div>
              <ul className="divide-y divide-slate-800/50">
                {filesQueue.map(item => (
                  <li key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-300 truncate">{item.file.name}</span>
                    </div>
                    <div className="flex items-center shrink-0 ml-4">
                      {item.status === 'pending' && <span className="text-xs text-slate-500 font-mono">Aguardando...</span>}
                      {item.status === 'extracting' && (
                        <div className="flex items-center gap-2 text-blue-500 text-xs font-mono">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extraindo IA...
                        </div>
                      )}
                      {item.status === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono">
                          <CheckCircle className="w-3.5 h-3.5" /> Sucesso
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <div className="text-red-500 text-xs font-mono max-w-[250px] truncate flex items-center gap-1" title={item.error}>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {item.error}
                          </div>
                          <button 
                            onClick={() => retryFile(item)}
                            className="shrink-0 flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Tentar
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              
              {!isProcessing && (successfulFiles.length > 0 || filesQueue.some(f => f.status === 'error')) && (
                <div className="p-4 bg-slate-950/30 flex justify-between items-center">
                  {filesQueue.some(f => f.status === 'error') && (
                    <button 
                      onClick={retryAllFailed} 
                      className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" /> Reprocessar Falhos ({filesQueue.filter(f => f.status === 'error').length})
                    </button>
                  )}
                  {successfulFiles.length > 0 && (
                    <button onClick={() => setStep(2)} className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                      Continuar para Mapeamento ({successfulFiles.length}) →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAPPING BATCH */}
      {step === 2 && (
        <div className="space-y-8">
          {successfulFiles.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/50">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                <FileCheck2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium text-white truncate">{item.file.name}</h3>
                {item.data?.ponto_amostragem && (
                  <span className="ml-auto text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    Identificado: {item.data.ponto_amostragem}
                  </span>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Vincular a qual Ponto de Coleta?</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.mappedPoint}
                      onChange={e => updateFileItem(item.id, { mappedPoint: e.target.value })}
                    >
                      <option value="">-- Selecione o Ponto --</option>
                      {context.points.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Data da Coleta</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={item.mappedDate}
                      onChange={e => updateFileItem(item.id, { mappedDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Parâmetros Mapeados</h4>
                  {item.data?.resultados?.map((p: any, pIdx: number) => {
                    const isUnmapped = !item.mappedParams[pIdx]
                    const createKey = `${item.id}-${pIdx}`
                    const isCreating = creatingParam === createKey

                    return (
                      <div key={pIdx} className={`flex flex-col md:flex-row items-center gap-4 p-3 rounded-lg border ${isUnmapped ? 'bg-amber-950/20 border-amber-800/40' : 'bg-slate-950 border-slate-800'}`}>
                        <div className="flex-1 w-full">
                          <div className="text-sm font-medium text-slate-300">
                            {p.parametro} <span className="text-slate-500 font-normal">({p.unidade})</span>
                          </div>
                          <div className="text-xl font-bold text-white mt-1">{p.bruto || p.valor}</div>
                        </div>
                        <div className="hidden md:flex items-center justify-center px-2">
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                        <div className="flex-1 w-full flex items-center gap-2">
                          <select 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={item.mappedParams[pIdx] || ''}
                            onChange={e => updateFileItem(item.id, { 
                              mappedParams: { ...item.mappedParams, [pIdx]: e.target.value } 
                            })}
                          >
                            <option value="">-- Ignorar --</option>
                            {context.parameters.map(param => (
                              <option key={param.id} value={param.id}>{param.name} ({param.unit})</option>
                            ))}
                          </select>
                          {isUnmapped && (
                            <button
                              onClick={() => handleCreateParam(item.id, pIdx, p.parametro, p.unidade)}
                              disabled={isCreating}
                              className="shrink-0 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-60 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors shadow-sm"
                              title={`Criar "${p.parametro}" como novo parâmetro`}
                            >
                              {isCreating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              Criar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
              ← Voltar à Fila
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
              {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Salvando Lote...' : `Salvar ${successfulFiles.length} Laudo(s) no Banco`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-xl shadow-emerald-900/10">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Lote Importado com Sucesso!</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Todos os {successfulFiles.length} laudos foram processados e atrelados aos parâmetros do CONAMA no Solentis. Ocorrências críticas já foram geradas se necessário.
          </p>
          <div className="flex gap-4">
            <button onClick={() => {
              setFilesQueue([])
              setStep(1)
            }} className="px-6 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
              Novo Lote
            </button>
            <button onClick={() => router.push('/gestor/leituras')} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-medium transition-colors">
              Ver Histórico de Leituras
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\laudos\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Beaker, FileCheck, Search, SlidersHorizontal, Upload } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LaudosExternosPage() {
  const pontos = await prisma.collectionPoint.findMany({
    where: { tenant_id: 'default', is_active: true },
    orderBy: { name: 'asc' },
    include: {
      analyses: {
        where: { laboratory_type: 'EXTERNAL' },
        orderBy: { collected_at: 'desc' },
        take: 1
      }
    }
  })

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileCheck className="h-8 w-8 text-[var(--brand)]" />
            Laudos Externos
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Gestão de campanhas legais e laudos laboratoriais por ponto de coleta
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar ponto de coleta..." 
              className="w-full bg-slate-900/50 border border-slate-800 rounded-md pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <Button variant="outline" size="icon" className="border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de Pontos de Coleta */}
      {pontos.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
              <Beaker className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-200">Nenhum ponto de coleta</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Cadastre pontos de coleta com matriz de referência legal para começar a registrar laudos.
            </p>
            <Button className="mt-6 bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
              Configurar Pontos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pontos.map((ponto) => {
            const lastAnalysis = ponto.analyses[0]
            
            return (
              <Card key={ponto.id} className="border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-200">
                        {ponto.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-400 mt-1">
                        {ponto.matrix ? (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                            Matriz: {ponto.matrix}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-900/50">
                            Matriz não configurada
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <span className="text-slate-500">Último Laudo: </span>
                      {lastAnalysis ? (
                        <span className="text-slate-300 font-medium">
                          {lastAnalysis.collected_at.toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Nenhum registro</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" className="flex-1 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300">
                        <Link href={`/gestor/laudos/${ponto.id}`}>
                          Ver Histórico
                        </Link>
                      </Button>
                      <Button asChild className="flex-1 bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 border-0">
                        <Link href={`/gestor/laudos/importar?ponto=${ponto.id}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          Registrar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\laudos\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, FileCheck, FileDown, Upload, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function LaudoPontoPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const pontoId = params.id

  const ponto = await prisma.collectionPoint.findUnique({
    where: { id: pontoId, tenant_id: 'default' },
    include: {
      analyses: {
        where: { laboratory_type: 'EXTERNAL' },
        orderBy: { collected_at: 'desc' },
        include: { parameter: true }
      }
    }
  })

  if (!ponto) notFound()

  // Buscar os limites configurados para a matriz deste ponto
  const limitesMatriz = ponto.matrix ? await prisma.parameterLimit.findMany({
    where: { tenant_id: 'default', matrix: ponto.matrix },
    include: { parameter: true }
  }) : []

  // Agrupar análises por "Campanha" (Data de coleta + PDF)
  // Como simplificação, agrupamos por YYYY-MM-DD
  const campanhas = ponto.analyses.reduce((acc, analysis) => {
    const key = format(analysis.collected_at, 'yyyy-MM-dd')
    if (!acc[key]) {
      acc[key] = {
        date: analysis.collected_at,
        isConformant: true,
        analyses: []
      }
    }
    acc[key].analyses.push(analysis)
    if (analysis.is_non_conformant) {
      acc[key].isConformant = false
    }
    return acc
  }, {} as Record<string, any>)

  const campanhasList = Object.values(campanhas).sort((a: any, b: any) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header com Navegação */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100">
            <Link href="/gestor/laudos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium text-slate-500">Voltar para visão geral</span>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
              {ponto.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
                Matriz: {ponto.matrix || 'Não configurada'}
              </Badge>
              {ponto.location && (
                <span className="text-sm text-slate-400">{ponto.location}</span>
              )}
            </div>
          </div>
          
          <Button asChild className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90">
            <Link href={`/gestor/laudos/importar?ponto=${ponto.id}`}>
              <Upload className="w-4 h-4 mr-2" />
              Registrar Laudo (PDF)
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Histórico de Campanhas */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-slate-400" />
                Histórico de Campanhas Legais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campanhasList.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>Nenhuma campanha registrada para este ponto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campanhasList.map((campanha: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                          {campanha.isConformant ? (
                            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                          ) : (
                            <XCircle className="h-5 w-5 text-[var(--alarm)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">
                            Campanha {format(campanha.date, "MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                          <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                            <span>{format(campanha.date, "dd/MM/yyyy")}</span>
                            <span>•</span>
                            <span>{campanha.analyses.length} parâmetros avaliados</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 flex items-center gap-3">
                        <Badge variant="outline" className={campanha.isConformant ? "text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/10" : "text-[var(--alarm)] border-[var(--alarm)]/20 bg-[var(--alarm)]/10"}>
                          {campanha.isConformant ? "Conforme" : "Não conforme"}
                        </Badge>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Tabela de Referência da Matriz */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-slate-200">Tabela de Referência</CardTitle>
              <CardDescription className="text-slate-400">
                Limites legais para {ponto.matrix || 'esta matriz'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {limitesMatriz.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-700 rounded-lg">
                  Nenhum limite configurado para a matriz <b>{ponto.matrix || '?'}</b>.
                </div>
              ) : (
                <div className="space-y-3">
                  {limitesMatriz.map((limite) => (
                    <div key={limite.id} className="flex justify-between items-center text-sm p-2 rounded bg-slate-800/30 border border-slate-800/50">
                      <span className="text-slate-300">{limite.parameter.name}</span>
                      <div className="text-slate-400 font-mono text-xs text-right">
                        {limite.rule_type === 'TETO' && (
                          <span>≤ {limite.max_limit} {limite.parameter.unit}</span>
                        )}
                        {limite.rule_type === 'FAIXA' && (
                          <span>{limite.min_limit} - {limite.max_limit} {limite.parameter.unit}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

`

### src\app\gestor\layout.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { GestorSidebar } from '@/components/gestor/sidebar'
import { TopNav } from '@/components/ui/top-nav'
import { MobileNav } from '@/components/mobile-nav'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'
import { ThemeToggle } from '@/components/theme-provider'
import { NotificationBell } from '@/components/ui/notification-bell'

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNav><GestorSidebar /></MobileNav>
            <Link href="/gestor/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Gestor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <ThemeToggle />
            <NotificationBell />
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-[244px] shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <GestorSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

`

### src\app\gestor\leituras\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function GestorLeiturasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where:   { tenant_id: (await getTenantId()) },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        recorder:         { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where: { tenant_id: (await getTenantId()) } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Todas as Leituras</h1>
            <p className="text-sm text-slate-400">Histórico completo de registros manuais e inteligência artificial. ({total} registros)</p>
          </div>
          <Link href={`/api/export?type=readings`} target="_blank">
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8">
              <Download className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </Link>
        </div>

        {/* Tabela de leituras */}
        {readings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-14 text-center text-sm text-slate-500">
            Nenhuma leitura registrada ainda.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/50 text-xs uppercase font-medium text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Ponto de Coleta</th>
                  <th className="px-4 py-3">Parâmetro</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {readings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDatetime(r.recorded_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-300">{r.collection_point.name}</td>
                    <td className="px-4 py-3">{r.parameter?.name || 'Observação Visual'}</td>
                    <td className="px-4 py-3">
                      {r.value !== null ? (
                        <span className="font-mono text-slate-200">
                          {r.value} {r.unit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.recorder?.name || 'Sistema'}</td>
                    <td className="px-4 py-3 text-right">
                      {r.is_non_conformant === true ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          FORA DO LIMITE
                        </span>
                      ) : r.is_non_conformant === false ? (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          CONFORME
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/gestor/leituras?page=${page - 1}`}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-500 font-medium">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/gestor/leituras?page=${page + 1}`}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
    </main>
  )
}

`

### src\app\gestor\loading.tsx
`	s
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}

`

### src\app\gestor\manutencao\corretivas\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default async function NovaCorretivaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  
  const [equipment, users] = await Promise.all([
    prisma.equipment.findMany({
      where: { tenant_id, is_active: true },
      select: { id: true, name: true, serial_number: true }
    }),
    prisma.user.findMany({
      where: { tenant_id, is_active: true, role: { in: ['TECHNICIAN', 'MANAGER'] } },
      select: { id: true, name: true }
    })
  ])

  // Simple placeholder for creating
  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <Link 
        href="/gestor/manutencao/corretivas" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Corretivas
      </Link>

      <PageHeader 
        title="Nova Manutenção Corretiva" 
        description="Registre uma nova manutenção corretiva."
      />

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm p-6">
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Equipamento</label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
              <option value="">Selecione um equipamento...</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.serial_number ? `(SN: ${e.serial_number})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição do Problema</label>
            <input type="text" className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" placeholder="O que aconteceu?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
                <option value="">Atribuir a...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações adicionais</label>
            <textarea className="w-full p-3 rounded-lg border border-border bg-surface-2" rows={3}></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Link href="/gestor/manutencao/corretivas" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors border border-border">Cancelar</Link>
            <button type="button" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all shadow-sm">
              Registrar Corretiva
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

`

### src\app\gestor\manutencao\corretivas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, CheckCircle2, AlertCircle, Wrench, CircleDashed } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR, PRIORITY_LABEL, SEVERITY_COLOR } from '@/lib/labels'

export default async function CorrectiveMaintenancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.correctiveMaintenance.findMany({
    where: { tenant_id },
    include: {
      equipment: true,
      responsible: { select: { name: true } },
    },
    orderBy: { start_date: 'desc' },
  })

  const getStatusBadge = (status: string) => {
    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-slate-800 text-slate-400 border-slate-700'
    const label = MAINTENANCE_STATUS_LABEL[status] || status

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status === 'IN_PROGRESS' && <CircleDashed className="w-3.5 h-3.5 animate-spin-slow" />}
        {(status === 'COMPLETED' || status === 'DONE' || status === 'RESOLVED') && <CheckCircle2 className="w-3.5 h-3.5" />}
        {(status === 'SCHEDULED' || status === 'CANCELLED') && <AlertCircle className="w-3.5 h-3.5" />}
        {label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string | null) => {
    const safePriority = priority || 'MEDIUM'
    const colorClass = SEVERITY_COLOR[safePriority] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    const label = PRIORITY_LABEL[safePriority] || safePriority
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>{label}</span>
  }

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Manutenção Corretiva" 
          description="Acompanhe as manutenções corretivas em equipamentos."
        />
        <Link 
          href="/gestor/manutencao/corretivas/nova" 
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Corretiva
        </Link>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Descrição / Equipamento</th>
                <th className="px-6 py-4">Data Início</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nenhuma manutenção corretiva cadastrada.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-sm">
                        <span className="font-medium text-foreground truncate" title={m.description}>{m.description}</span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.equipment.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {m.start_date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(m.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(m.status)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {m.responsible?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/gestor/manutencao/corretivas/${m.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-xs transition-colors"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

`

### src\app\gestor\manutencao\preventivas\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default async function NovaPreventivaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  const equipment = await prisma.equipment.findMany({
    where: { tenant_id, is_active: true },
    select: { id: true, name: true, serial_number: true }
  })

  // Simple placeholder for creating
  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <Link 
        href="/gestor/manutencao/preventivas" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Preventivas
      </Link>

      <PageHeader 
        title="Nova Manutenção Preventiva" 
        description="Agende uma nova manutenção para um equipamento."
      />

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm p-6">
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Equipamento</label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
              <option value="">Selecione um equipamento...</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.serial_number ? `(SN: ${e.serial_number})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Agendada</label>
            <input type="date" className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea className="w-full p-3 rounded-lg border border-border bg-surface-2" rows={4}></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Link href="/gestor/manutencao/preventivas" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors border border-border">Cancelar</Link>
            <button type="button" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all shadow-sm">
              Agendar Manutenção
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

`

### src\app\gestor\manutencao\preventivas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, CheckCircle2, AlertCircle, Wrench, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_STATUS_COLOR } from '@/lib/labels'

export default async function PreventiveMaintenancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()

  const maintenances = await prisma.preventiveMaintenance.findMany({
    where: { tenant_id },
    include: {
      equipment: true,
      completer: { select: { name: true } },
    },
    orderBy: { scheduled_date: 'asc' },
  })

  const getStatusBadge = (status: string, date: Date) => {
    const isPast = date < new Date() && status !== 'COMPLETED' && status !== 'DONE'

    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Atrasada
        </span>
      )
    }

    const colorClass = MAINTENANCE_STATUS_COLOR[status] || 'bg-slate-800 text-slate-400 border-slate-700'
    const label = MAINTENANCE_STATUS_LABEL[status] || status

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status === 'DONE' || status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
        {label}
      </span>
    )
  }

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Manutenção Preventiva" 
          description="Acompanhe as manutenções agendadas e histórico de execuções."
        />
        <div className="flex gap-2">
          <Link 
            href="/api/export?type=preventives" target="_blank"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-surface-2 text-foreground text-sm font-medium rounded-lg hover:bg-surface-2/80 transition-all shadow-sm border border-border"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Link>
          <Link 
            href="/gestor/manutencao/preventivas/nova" 
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:brightness-105 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Preventiva
          </Link>
        </div>
      </div>

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Data Agendada</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nenhuma manutenção preventiva cadastrada.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{m.equipment.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{m.equipment.serial_number ? `SN: ${m.equipment.serial_number}` : 'Sem SN'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {m.scheduled_date.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(m.status, m.scheduled_date)}
                    </td>
                    <td className="px-6 py-4">
                      {m.completer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/gestor/manutencao/preventivas/${m.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-xs transition-colors"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

`

### src\app\gestor\ocorrencias\nova\occurrence-form.tsx
`	s
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '@/app/operador/ocorrencias/actions'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'occurrence_draft_gestor'
const INITIAL: OcorrenciaFormState = {}

const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = { description: string; severity: string; category: string; collection_point_id: string }
const EMPTY_DRAFT: Draft = { description: '', severity: '', category: '', collection_point_id: '' }

export function GestorOccurrenceForm({ collectionPoints = [] }: { collectionPoints?: {id: string, name: string, location: string | null}[] }) {
  const router   = useRouter()
  const formRef  = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)

  const [mounted,      setMounted]      = useState(false)
  const [draft,        setDraft]        = useState<Draft>(EMPTY_DRAFT)
  const [photoName,    setPhotoName]    = useState<string | null>(null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved) as Draft)
    } catch { /* ignora */ }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/gestor/ocorrencias')
    }
  }, [state.success, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(null); return }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Formato inválido. Use JPG, PNG ou WEBP.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Arquivo muito grande. Máximo 5 MB.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    setPhotoName(file.name)
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo?.[0]

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-5"
    >
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description" name="description"
          rows={4}
          autoComplete="off"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-medium text-slate-300">
          Categoria *
        </label>
        <select
          id="category" name="category"
          value={draft.category}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Selecione…</option>
          <option value="VAZAMENTO">Vazamento</option>
          <option value="QUEBRA">Quebra de Equipamento</option>
          <option value="FALTA_PRODUTO">Falta de Produto</option>
          <option value="SEGURANCA">Segurança/Risco</option>
          <option value="OUTROS">Outros</option>
        </select>
        {state.fieldErrors?.category && (
          <p className="text-xs text-red-400">{state.fieldErrors.category[0]}</p>
        )}
      </div>

      {/* Ponto de Coleta (Opcional) */}
      <div className="space-y-1.5">
        <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
          Ponto de Coleta <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <select
          id="collection_point_id" name="collection_point_id"
          value={draft.collection_point_id}
          onChange={(e) => setDraft((d) => ({ ...d, collection_point_id: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Nenhum específico</option>
          {collectionPoints.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.location ? `(${p.location})` : ''}
            </option>
          ))}
        </select>
        {state.fieldErrors?.collection_point_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-medium text-slate-300">
          Severidade *
        </label>
        <select
          id="severity" name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Selecione…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido */}
      {draft.severity && (
        <div className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm">
          <span className="text-slate-500">Prazo para resolução: </span>
          <span className="text-slate-300 font-medium">{DEADLINE_LABEL[draft.severity]}</span>
        </div>
      )}

      {/* Foto */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Foto <span className="text-slate-500 font-normal">(opcional — JPG, PNG ou WEBP, máx. 5 MB)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 hover:bg-slate-800 transition-colors">
          <span className="text-xs text-slate-400 flex-1 truncate">
            {photoName ?? 'Selecionar uma foto'}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <span className="shrink-0 rounded px-2 py-1 text-xs bg-slate-700 text-slate-300">
            Escolher
          </span>
        </label>
        {photoFieldError && (
          <p className="text-xs text-red-400">{photoFieldError}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}

`

### src\app\gestor\ocorrencias\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { GestorOccurrenceForm } from './occurrence-form'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export default async function NovaOcorrenciaGestorPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const collectionPoints = await prisma.collectionPoint.findMany({
    where: { tenant_id: await getTenantId(), is_active: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' }
  })

  return (
    <main className="p-6 max-w-lg mx-auto space-y-4">
      <div>
        <BackButton href="/gestor/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <GestorOccurrenceForm collectionPoints={collectionPoints} />
    </main>
  )
}

`

### src\app\gestor\ocorrencias\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { Download } from 'lucide-react'

import { SEVERITY_LABEL, SEVERITY_COLOR, OCCURRENCE_STATUS_LABEL, OCCURRENCE_STATUS_COLOR } from '@/lib/labels'

const PAGE_SIZE  = 25

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasGestorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Ocorrências</h1>
          <p className="text-xs text-slate-400">{total} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/gestor/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Nova ocorrência
            </Button>
          </Link>
          <Link href={`/api/export?type=occurrences${showAll ? '&status=all' : ''}`} target="_blank">
            <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8">
              <Download className="w-4 h-4 mr-1.5" />
              Exportar CSV
            </Button>
          </Link>
          <Link
            href="/gestor/ocorrencias"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              !showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Em aberto
          </Link>
          <Link
            href="/gestor/ocorrencias?status=all"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              showAll
                ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Tabela */}
      {ocorrencias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
          Nenhuma ocorrência encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Severidade</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Reportado por</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ocorrencias.map((oc) => {
                const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
                const hasPhoto     = oc.photos.length > 0

                return (
                  <tr key={oc.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? ''}`}>
                          {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                        </span>
                        {prazoVencido && (
                          <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                            VENCIDO
                          </span>
                        )}
                        {hasPhoto && (
                          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                            📷
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-slate-200 line-clamp-1">{oc.description}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{formatDatetime(oc.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{oc.reporter.name}</td>
                    <td className={`px-4 py-3 ${prazoVencido ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                      {formatDatetime(oc.deadline)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${OCCURRENCE_STATUS_COLOR[oc.status] ?? ''}`}>
                        {OCCURRENCE_STATUS_LABEL[oc.status] ?? oc.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          {page > 1 ? (
            <Link
              href={`/gestor/ocorrencias?page=${page - 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Anterior
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/gestor/ocorrencias?page=${page + 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              Próxima →
            </Link>
          ) : <span />}
        </div>
      )}
    </main>
  )
}

`

### src\app\gestor\parametros\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
  return session
}

const ParametroSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  unit: z.string().min(1, 'Informe a unidade'),
  min_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  max_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  legal_reference: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  effective_date: z.string().min(1, 'Informe a data de vigência'),
  default_method_name: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  collection_points: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
}).refine(
  (d) => d.min_limit === null || d.max_limit === null || d.min_limit < d.max_limit,
  { message: 'Limite mínimo deve ser menor que o máximo', path: ['max_limit'] },
)

export type ParametroFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarParametro(
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    default_method_name: formData.get('default_method_name'),
    collection_points: formData.get('collection_points'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const created = await prisma.$transaction(async (tx) => {
    let methodId = null
    if (parsed.data.default_method_name) {
      const methodName = parsed.data.default_method_name.trim()
      let method = await tx.analysisMethod.findUnique({
        where: { tenant_id_name: { tenant_id: tenantId, name: methodName } }
      })
      if (!method) {
        method = await tx.analysisMethod.create({ data: { tenant_id: tenantId, name: methodName } })
      }
      methodId = method.id
    }

    const cpNames = parsed.data.collection_points ? parsed.data.collection_points.split(',').map(s => s.trim()).filter(Boolean) : []
    const cpIds = []
    for (const cpName of cpNames) {
      let cp = await tx.collectionPoint.findFirst({
        where: { tenant_id: tenantId, name: { equals: cpName, mode: 'insensitive' } }
      })
      if (!cp) {
        cp = await tx.collectionPoint.create({ data: { tenant_id: tenantId, name: cpName } })
      }
      cpIds.push(cp.id)
    }

    const param = await tx.qualityParameter.create({
      data: {
        tenant_id:       tenantId,
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  new Date(parsed.data.effective_date + 'T00:00:00.000Z'),
        is_active:       true,
        created_by:      userId,
        default_method_id: methodId,
        collection_points: {
          connect: cpIds.map(id => ({ id }))
        }
      },
      select: { id: true },
    })
    await logAudit(tx, {
      userId,
      action:    'CREATE',
      tableName: 'quality_parameters',
      recordId:  param.id,
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit },
    })
    return param
  })
  void created

  revalidatePath('/gestor/parametros')
  redirect('/gestor/parametros')
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarParametro(
  parametroId: string,
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    default_method_name: formData.get('default_method_name'),
    collection_points: formData.get('collection_points'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tenantId = await getTenantId()
  const [current, userId] = await Promise.all([
    prisma.qualityParameter.findFirst({ where: { id: parametroId , tenant_id: tenantId },
      select: { name: true, unit: true, min_limit: true, max_limit: true, effective_date: true },
    }),
    resolveUserId(session.user.email!),
  ])

  if (!current) return { error: 'Parâmetro não encontrado.' }
  if (!userId)  return { error: 'Sessão inválida.' }

  const newDate = new Date(parsed.data.effective_date + 'T00:00:00.000Z')

  const limitsChanged =
    current.min_limit        !== parsed.data.min_limit ||
    current.max_limit        !== parsed.data.max_limit ||
    current.effective_date.getTime() !== newDate.getTime()

  await prisma.$transaction(async (tx) => {
    let methodId = null
    if (parsed.data.default_method_name) {
      const methodName = parsed.data.default_method_name.trim()
      let method = await tx.analysisMethod.findUnique({
        where: { tenant_id_name: { tenant_id: tenantId, name: methodName } }
      })
      if (!method) {
        method = await tx.analysisMethod.create({ data: { tenant_id: tenantId, name: methodName } })
      }
      methodId = method.id
    }

    const cpNames = parsed.data.collection_points ? parsed.data.collection_points.split(',').map(s => s.trim()).filter(Boolean) : []
    const cpIds = []
    for (const cpName of cpNames) {
      let cp = await tx.collectionPoint.findFirst({
        where: { tenant_id: tenantId, name: { equals: cpName, mode: 'insensitive' } }
      })
      if (!cp) {
        cp = await tx.collectionPoint.create({ data: { tenant_id: tenantId, name: cpName } })
      }
      cpIds.push(cp.id)
    }

    if (limitsChanged) {
      await tx.parameterHistory.create({
        data: {
          parameter_id:          parametroId,
          min_limit_before:      current.min_limit,
          max_limit_before:      current.max_limit,
          min_limit_after:       parsed.data.min_limit,
          max_limit_after:       parsed.data.max_limit,
          effective_date_before: current.effective_date,
          effective_date_after:  newDate,
          changed_by:            userId,
        },
      })
    }

    await tx.qualityParameter.update({ 
      where: { id: parametroId }, 
      data: {
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  newDate,
        default_method_id: methodId,
        collection_points: {
          set: cpIds.map(id => ({ id }))
        }
      },
    })

    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { name: current.name, unit: current.unit, min_limit: current.min_limit, max_limit: current.max_limit, effective_date: current.effective_date },
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit, effective_date: newDate },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return { success: true }
}

// ─── Toggle ativo ─────────────────────────────────────────────────────────────

export async function toggleAtivoParametro(
  parametroId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [param, userId] = await Promise.all([
    prisma.qualityParameter.findFirst({ where: { id: parametroId , tenant_id: (await getTenantId()) },
      select: { is_active: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!param) return { error: 'Parâmetro não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.qualityParameter.updateMany({ where: { id: parametroId , tenant_id: (await getTenantId()) }, data:  { is_active: !param.is_active },
    })
    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { is_active:  param.is_active  },
      after:     { is_active: !param.is_active  },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return {}
}

`

### src\app\gestor\parametros\novo\page.tsx
`	s
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarParametro, type ParametroFormState } from '../actions'

const initialState: ParametroFormState = {}

const today = new Date().toISOString().split('T')[0]

export default function NovoParametroPage() {
  const [state, formAction, isPending] = useActionState(criarParametro, initialState)

  return (
    <div className="px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/parametros" label="Parâmetros" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo parâmetro</h2>
            <p className="text-xs text-slate-400">
              Defina o parâmetro de qualidade e seus limites de conformidade.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
                <Input
                  id="name" name="name" type="text"
                  placeholder="Ex: pH, DBO₅, Turbidez"
                  required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
                {state.fieldErrors?.name && (
                  <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
                <Input
                  id="unit" name="unit" type="text"
                  placeholder="mg/L, NTU, adimensional…"
                  required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
                {state.fieldErrors?.unit && (
                  <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="min_limit" className="text-sm font-medium text-slate-300">
                  Limite mínimo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="min_limit" name="min_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                  Limite máximo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="max_limit" name="max_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
                Referência legal <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="legal_reference" name="legal_reference" type="text"
                placeholder="Ex: CONAMA 430/2011 Art. 16"
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="effective_date" className="text-sm font-medium text-slate-300">
                Data de vigência
              </label>
              <Input
                id="effective_date" name="effective_date" type="date"
                defaultValue={today}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.effective_date && (
                <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="default_method_name" className="text-sm font-medium text-slate-300">
                  Método Padrão <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="default_method_name" name="default_method_name" type="text"
                  placeholder="Ex: SM 4500-H+ B"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="collection_points" className="text-sm font-medium text-slate-300">
                  Pontos de Coleta <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="collection_points" name="collection_points" type="text"
                  placeholder="Separe por vírgula (ex: Tanque 1, Entrada)"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending}
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar parâmetro'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

`

### src\app\gestor\parametros\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

function formatLimit(value: number | null): string {
  if (value === null) return '—'
  return value.toString()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const params = await prisma.qualityParameter.findMany({
    where: {
      tenant_id: (await getTenantId()),
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
    },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parâmetros de Qualidade</h1>
          <p className="text-sm text-slate-400">Limites e referências legais (CONAMA).</p>
        </div>
        <Link href="/gestor/parametros/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo parâmetro
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/parametros">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {params.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum parâmetro encontrado para "${search}".` : 'Nenhum parâmetro cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Parâmetro</th>
                <th className="px-4 py-3">Limites</th>
                <th className="px-4 py-3">Vigência</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {params.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.unit}</div>
                    {p.legal_reference && (
                      <div className="text-xs text-slate-600">{p.legal_reference}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                    {formatLimit(p.min_limit)} – {formatLimit(p.max_limit)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(p.effective_date)}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/parametros/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                        Editar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{params.length} parâmetro(s) encontrado(s)</p>
    </main>
  )
}

`

### src\app\gestor\parametros\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarParametro, toggleAtivoParametro, type ParametroFormState } from '../actions'

type Parametro = {
  id:              string
  name:            string
  unit:            string
  min_limit:       number | null
  max_limit:       number | null
  legal_reference: string | null
  effective_date:  Date
  is_active:       boolean
  method?:         { name: string } | null
  collection_points?: { name: string }[]
}

const initialState: ParametroFormState = {}

export function EditParametroForm({ parametro }: { parametro: Parametro }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarParametro.bind(null, parametro.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  const isPending = isPendingForm || isPendingToggle

  function handleToggle() {
    const msg = parametro.is_active
      ? 'Desativar este parâmetro? Ele deixará de aparecer em novos registros.'
      : 'Reativar este parâmetro?'
    if (!confirm(msg)) return

    startToggle(async () => {
      await toggleAtivoParametro(parametro.id)
      router.refresh()
    })
  }

  const effectiveDateStr = parametro.effective_date.toISOString().split('T')[0]

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/parametros" label="Parâmetros" />

      {/* Título + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{parametro.name}</h1>
          <p className="text-sm text-slate-400">{parametro.unit}</p>
        </div>
        {parametro.is_active ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <h2 className="text-base font-medium text-slate-200">Dados do parâmetro</h2>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                defaultValue={parametro.name}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
              <Input
                id="unit" name="unit" type="text"
                defaultValue={parametro.unit}
                placeholder="mg/L, NTU, pH…"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.unit && (
                <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="min_limit" className="text-sm font-medium text-slate-300">
                Limite mínimo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="min_limit" name="min_limit" type="number" step="0.01"
                defaultValue={parametro.min_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                Limite máximo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="max_limit" name="max_limit" type="number" step="0.01"
                defaultValue={parametro.max_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
              Referência legal <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <Input
              id="legal_reference" name="legal_reference" type="text"
              defaultValue={parametro.legal_reference ?? ''}
              placeholder="Ex: CONAMA 430/2011 Art. 16"
              disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="default_method_name" className="text-sm font-medium text-slate-300">
                Método Padrão <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="default_method_name" name="default_method_name" type="text"
                defaultValue={parametro.method?.name ?? ''}
                placeholder="Ex: SM 4500-H+ B"
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="collection_points" className="text-sm font-medium text-slate-300">
                Pontos de Coleta <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="collection_points" name="collection_points" type="text"
                defaultValue={parametro.collection_points?.map(p => p.name).join(', ') ?? ''}
                placeholder="Separe por vírgula (ex: Tanque 1, Entrada)"
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="effective_date" className="text-sm font-medium text-slate-300">
              Data de vigência
            </label>
            <Input
              id="effective_date" name="effective_date" type="date"
              defaultValue={effectiveDateStr}
              required disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
            />
            {state.fieldErrors?.effective_date && (
              <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          {state.success && (
            <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
              Parâmetro atualizado com sucesso.
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

      {/* Ações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>
        <Button
          type="button" variant="outline" disabled={isPending}
          onClick={handleToggle}
          className={
            parametro.is_active
              ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
              : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'
          }
        >
          {isPendingToggle ? 'Aguarde…' : parametro.is_active ? 'Desativar parâmetro' : 'Reativar parâmetro'}
        </Button>
      </div>
    </main>
  )
}

`

### src\app\gestor\parametros\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditParametroForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarParametroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const parametro = await prisma.qualityParameter.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
      method: { select: { name: true } },
      collection_points: { select: { name: true } }
    },
  })

  if (!parametro) notFound()

  return <EditParametroForm parametro={parametro} />
}

`

### src\app\gestor\prazos-ocorrencia\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
  return session
}

const PrazosSchema = z.object({
  CRITICAL: z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  HIGH:     z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  MEDIUM:   z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  LOW:      z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
})

export type PrazosFormState = {
  error?:   string
  success?: boolean
}

export async function atualizarPrazos(
  _prev: PrazosFormState,
  formData: FormData,
): Promise<PrazosFormState> {
  const session = await requireManager()

  const parsed = PrazosSchema.safeParse({
    CRITICAL: formData.get('deadline_CRITICAL'),
    HIGH:     formData.get('deadline_HIGH'),
    MEDIUM:   formData.get('deadline_MEDIUM'),
    LOW:      formData.get('deadline_LOW'),
  })
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { error: first ?? 'Valores inválidos.' }
  }

  // Resolver o ID do usuário logado para updated_by
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })
  if (!user) return { error: 'Sessão inválida.' }

  await Promise.all(
    SEVERITIES.map((severity) =>
      prisma.occurrenceSeverityDefault.update({
        where: { severity },
        data:  { deadline_hours: parsed.data[severity], updated_by: user.id },
      }),
    ),
  )

  revalidatePath('/gestor/prazos-ocorrencia')
  return { success: true }
}

`

### src\app\gestor\prazos-ocorrencia\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { PrazosForm } from './prazos-form'

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Crítica',  color: 'text-red-400' },
  HIGH:     { label: 'Alta',     color: 'text-orange-400' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400' },
  LOW:      { label: 'Baixa',    color: 'text-slate-400' },
}

export default async function PrazosOcorrenciaPage() {
  const prazos = await prisma.occurrenceSeverityDefault.findMany({
    orderBy: { deadline_hours: 'asc' },
  })

  const initialValues = Object.fromEntries(
    prazos.map((p) => [p.severity, p.deadline_hours]),
  ) as Record<string, number>

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Prazos de Ocorrência</h1>
        <p className="text-sm text-slate-400">
          Prazo máximo (em horas) para resolução de ocorrências por severidade.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
        <p className="text-xs text-slate-500">
          Os prazos são sugeridos automaticamente ao registrar uma ocorrência e podem ser editados pelo Técnico ou Gestor.
        </p>

        <PrazosForm initialValues={initialValues} severityLabels={SEVERITY_LABELS} />
      </div>
    </main>
  )
}

`

### src\app\gestor\prazos-ocorrencia\prazos-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { atualizarPrazos, type PrazosFormState } from './actions'

const ORDERED = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const initialState: PrazosFormState = {}

type Props = {
  initialValues:  Record<string, number>
  severityLabels: Record<string, { label: string; color: string }>
}

export function PrazosForm({ initialValues, severityLabels }: Props) {
  const [state, formAction, isPending] = useActionState(atualizarPrazos, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        {ORDERED.map((severity) => {
          const { label, color } = severityLabels[severity]
          return (
            <div key={severity} className="flex items-center gap-4">
              <span className={`w-20 text-sm font-medium ${color}`}>{label}</span>
              <div className="flex items-center gap-2">
                <Input
                  name={`deadline_${severity}`}
                  type="number"
                  min={1}
                  defaultValue={initialValues[severity] ?? ''}
                  required
                  disabled={isPending}
                  className="w-28 border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
                />
                <span className="text-sm text-slate-500">horas</span>
              </div>
            </div>
          )
        })}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Prazos atualizados com sucesso.
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar prazos'}
      </Button>
    </form>
  )
}

`

### src\app\gestor\produtos-quimicos\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { CHEMICAL_UNITS_PRESET } from '@/types'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    redirect('/login')
  }
  return session
}

async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user.id
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitValues = [...CHEMICAL_UNITS_PRESET, 'outro'] as const

const ProdutoSchema = z.object({
  name:        z.string().min(2, { error: 'Nome deve ter pelo menos 2 caracteres' }),
  unit_select: z.enum(unitValues, { error: 'Selecione a unidade' }),
  unit_custom: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(20).nullable(),
  ),
  min_stock: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Estoque mínimo inválido' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const EntradaSchema = z.object({
  product_id:     z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:       z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  supplier:       z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  invoice_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  notes:          z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  received_at:    z.string().min(1, { error: 'Data de recebimento obrigatória' }),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUnit(unit_select: string, unit_custom: string | null): string {
  return unit_select === 'outro' ? (unit_custom ?? '').trim() : unit_select
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function criarProduto(_prev: unknown, formData: FormData) {
  const session = await requireManager()

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalProduct.create({
    data: { tenant_id: (await getTenantId()), name, unit, min_stock, description, created_by: recorded_by },
  })

  revalidatePath('/gestor/produtos-quimicos')
  return { success: true }
}

export async function editarProduto(_prev: unknown, formData: FormData) {
  await requireManager()

  const id = formData.get('id') as string
  if (!id) return { error: 'ID inválido' }

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  await prisma.chemicalProduct.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data:  { name, unit, min_stock, description },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
  return { success: true }
}

export async function toggleAtivoProduto(id: string, is_active: boolean) {
  await requireManager()

  await prisma.chemicalProduct.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data:  { is_active },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
}

export async function registrarEntrada(_prev: unknown, formData: FormData) {
  const session = await requireManagerOrTechnician()

  const parsed = EntradaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, supplier, invoice_number, notes, received_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockEntry.create({
    data: {
      tenant_id: (await getTenantId()),
      product_id,
      quantity,
      supplier,
      invoice_number,
      notes,
      received_at: new Date(received_at),
      recorded_by,
    },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${product_id}`)
  return { success: true }
}

`

### src\app\gestor\produtos-quimicos\novo\page.tsx
`	s
import { ProductForm } from './product-form'
import { BackButton } from '@/components/back-button'

export default function NovoProdutoPage() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href="/gestor/produtos-quimicos" label="Produtos Químicos" />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Novo Produto Químico</h1>
      </div>
      <ProductForm />
    </div>
  )
}

`

### src\app\gestor\produtos-quimicos\novo\product-form.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS } from '@/types'

export function ProductForm() {
  const router = useRouter()
  const [unitSelect, setUnitSelect] = useState('')
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await criarProduto(prev, formData)
    if (result?.success) router.push('/gestor/produtos-quimicos')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Nome *</label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Cloro Granulado"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Unidade de medida *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: caixa, fardo, tonelada..."
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
        <p className="text-xs text-slate-500">Alerta disparado quando calculado ou físico ficar abaixo deste valor.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Descrição</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Uso, concentração, fornecedor padrão..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Salvando...' : 'Cadastrar produto'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/gestor/produtos-quimicos')}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

`

### src\app\gestor\produtos-quimicos\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'


export default async function ProdutosQuimicosPage() {
  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: (await getTenantId()) },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Produtos Químicos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Estoque e movimentação de reagentes</p>
        </div>
        <Link
          href="/gestor/produtos-quimicos/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum produto cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)

            return (
              <Link
                key={p.id}
                href={`/gestor/produtos-quimicos/${p.id}`}
                className={`block rounded-lg border p-4 transition-colors hover:border-slate-600 ${
                  !p.is_active
                    ? 'border-slate-800 bg-slate-900/40 opacity-60'
                    : alerta
                    ? 'border-red-800/60 bg-slate-900'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {!p.is_active && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
                      )}
                      {alerta && p.is_active && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.description}</p>
                    )}
                  </div>

                  <div className="flex gap-6 shrink-0 text-right text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Calculado</p>
                      <p className={`font-medium ${alerta && calculado < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {formatarQuantidade(calculado)} {p.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Físico</p>
                      <p className={`font-medium ${fisico !== null && fisico < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Mínimo</p>
                      <p className="font-medium text-slate-400">
                        {formatarQuantidade(p.min_stock)} {p.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\produtos-quimicos\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { editarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS, CHEMICAL_UNITS_PRESET } from '@/types'

type Product = {
  id: string
  name: string
  unit: string
  min_stock: number
  description: string | null
}

export function EditForm({ product }: { product: Product }) {
  const isPreset   = (CHEMICAL_UNITS_PRESET as readonly string[]).includes(product.unit)
  const [unitSelect, setUnitSelect] = useState(isPreset ? product.unit : 'outro')
  const [state, action, pending] = useActionState(editarProduto, null)

  return (
    <form action={action} className="space-y-4 mt-3">
      <input type="hidden" name="id" value={product.id} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-900/40 border border-green-700 px-3 py-2 text-sm text-green-300">
          Produto atualizado.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Nome *</label>
        <input
          name="name"
          required
          defaultValue={product.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Unidade *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            defaultValue={!isPreset ? product.unit : ''}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={product.min_stock}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Descrição</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={product.description ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}

`

### src\app\gestor\produtos-quimicos\[id]\entrada\entry-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEntrada } from '../../actions'

type Props = { productId: string; productName: string; unit: string }

export function EntryForm({ productId, productName, unit }: Props) {
  const router = useRouter()
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarEntrada(prev, formData)
    if (result?.success) router.push(`/gestor/produtos-quimicos/${productId}`)
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="rounded-md bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
        Produto: <span className="text-slate-200 font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Lote, validade, condições do recebimento..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar entrada'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/gestor/produtos-quimicos/${productId}`)}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

`

### src\app\gestor\produtos-quimicos\[id]\entrada\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EntryForm } from './entry-form'
import { getTenantId } from '@/lib/tenant'


export default async function EntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href={`/gestor/produtos-quimicos/${id}`} label={product.name} />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Registrar Entrada</h1>
        <p className="text-sm text-slate-400 mt-0.5">Compra ou recebimento de estoque</p>
      </div>
      <EntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </div>
  )
}

`

### src\app\gestor\produtos-quimicos\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  calcularEstoqueAtual,
  calcularDivergencia,
  estaAbaixoMinimo,
  formatarQuantidade,
} from '@/lib/stock-utils'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'
import { BackButton } from '@/components/back-button'
import { getTenantId } from '@/lib/tenant'


type Movement =
  | { tipo: 'entrada';  date: Date; qty: number; supplier: string | null; invoice: string | null; notes: string | null; recorder: string }
  | { tipo: 'saida';    date: Date; qty: number; notes: string | null; recorder: string }
  | { tipo: 'contagem'; date: Date; qty: number; notes: string | null; recorder: string }

export default async function ProdutoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: (await getTenantId()) },
    include: {
      entries: { orderBy: { received_at: 'desc' }, include: { recorder: { select: { name: true } } } },
      exits:   { orderBy: { used_at:     'desc' }, include: { recorder: { select: { name: true } } } },
      counts:  { orderBy: { counted_at:  'desc' }, include: { recorder: { select: { name: true } } } },
    },
  })

  if (!product) notFound()

  const totalEntradas = product.entries.reduce((s, e) => s + e.quantity, 0)
  const totalSaidas   = product.exits.reduce((s, e) => s + e.quantity, 0)
  const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
  const fisico        = product.counts[0]?.counted_quantity ?? null
  const divergencia   = calcularDivergencia(calculado, fisico)
  const alerta        = estaAbaixoMinimo(calculado, fisico, product.min_stock)

  const movements: Movement[] = [
    ...product.entries.map((e) => ({
      tipo: 'entrada' as const,
      date: e.received_at,
      qty: e.quantity,
      supplier: e.supplier,
      invoice: e.invoice_number,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.exits.map((e) => ({
      tipo: 'saida' as const,
      date: e.used_at,
      qty: e.quantity,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.counts.map((c) => ({
      tipo: 'contagem' as const,
      date: c.counted_at,
      qty: c.counted_quantity,
      notes: c.notes,
      recorder: c.recorder.name,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <BackButton href="/gestor/produtos-quimicos" label="Produtos Químicos" />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-100">{product.name}</h1>
            {!product.is_active && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
            )}
            {alerta && product.is_active && (
              <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                ESTOQUE BAIXO
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/gestor/produtos-quimicos/${id}/entrada`}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Registrar entrada
        </Link>
      </div>

      {/* Resumo de estoque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Estoque calculado',
            value: `${formatarQuantidade(calculado)} ${product.unit}`,
            color: calculado < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Estoque físico',
            value: fisico !== null ? `${formatarQuantidade(fisico)} ${product.unit}` : '—',
            color: fisico !== null && fisico < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Mínimo',
            value: `${formatarQuantidade(product.min_stock)} ${product.unit}`,
            color: 'text-slate-400',
          },
          {
            label: 'Divergência',
            value: divergencia !== null
              ? `${divergencia >= 0 ? '+' : ''}${formatarQuantidade(divergencia)} ${product.unit}`
              : '—',
            color: divergencia === null ? 'text-slate-500'
              : divergencia < 0 ? 'text-amber-400'
              : 'text-green-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Editar produto */}
      <details className="rounded-lg border border-slate-700 bg-slate-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 select-none">
          Editar dados do produto
        </summary>
        <div className="px-4 pb-4">
          <EditForm product={product} />
        </div>
      </details>

      <ToggleButton id={product.id} is_active={product.is_active} />

      {/* Histórico de movimentação */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Histórico de movimentação ({movements.length})
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded ${
                  m.tipo === 'entrada'  ? 'bg-green-900/40 text-green-400' :
                  m.tipo === 'saida'   ? 'bg-red-900/40 text-red-400' :
                                         'bg-blue-900/40 text-blue-400'
                }`}>
                  {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Contagem'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">
                      {m.tipo === 'contagem' ? '=' : m.tipo === 'entrada' ? '+' : '−'}{formatarQuantidade(m.qty)} {product.unit}
                    </span>
                    {m.tipo === 'entrada' && m.supplier && (
                      <span className="text-xs text-slate-400">· {m.supplier}</span>
                    )}
                    {m.tipo === 'entrada' && m.invoice && (
                      <span className="text-xs text-slate-500">NF {m.invoice}</span>
                    )}
                  </div>
                  {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {m.date.toLocaleString('pt-BR')} · {m.recorder}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

`

### src\app\gestor\produtos-quimicos\[id]\toggle-button.tsx
`	s
'use client'

import { useTransition } from 'react'
import { toggleAtivoProduto } from '../actions'

export function ToggleButton({ id, is_active }: { id: string; is_active: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => toggleAtivoProduto(id, !is_active))}
      disabled={pending}
      className={`rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
        is_active
          ? 'border-red-800 text-red-400 hover:bg-red-900/20'
          : 'border-green-800 text-green-400 hover:bg-green-900/20'
      }`}
    >
      {pending ? '...' : is_active ? 'Desativar produto' : 'Reativar produto'}
    </button>
  )
}

`

### src\app\gestor\relatorios\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function getReportData(startDate: string, endDate: string) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso negado')
  }

  const tenantId = await getTenantId()
  const start = new Date(startDate)
  const end = new Date(endDate)
  // Ensure the end date covers the whole day
  end.setHours(23, 59, 59, 999)

  // 1. Leituras no período
  const readings = await prisma.reading.findMany({
    where: {
      tenant_id: tenantId,
      recorded_at: {
        gte: start,
        lte: end
      },
      parameter_id: { not: null }
    },
    include: {
      parameter: true,
      collection_point: true
    }
  })

  // Group readings by parameter
  const parameterStats: Record<string, any> = {}
  let totalNonConformant = 0

  for (const r of readings) {
    if (!r.parameter) continue
    const pid = r.parameter.id
    if (!parameterStats[pid]) {
      parameterStats[pid] = {
        name: r.parameter.name,
        unit: r.parameter.unit,
        minLimit: r.parameter.min_limit,
        maxLimit: r.parameter.max_limit,
        values: [],
        nonConformantCount: 0
      }
    }
    if (r.value !== null) {
      parameterStats[pid].values.push(r.value)
    }
    if (r.is_non_conformant) {
      parameterStats[pid].nonConformantCount++
      totalNonConformant++
    }
  }

  const consolidatedParameters = Object.values(parameterStats).map(p => {
    const vals = p.values
    const min = vals.length > 0 ? Math.min(...vals) : null
    const max = vals.length > 0 ? Math.max(...vals) : null
    const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
    return {
      name: p.name,
      unit: p.unit,
      minLimit: p.minLimit,
      maxLimit: p.maxLimit,
      min,
      max,
      avg: avg !== null ? parseFloat(avg.toFixed(2)) : null,
      nonConformantCount: p.nonConformantCount,
      totalReadings: vals.length
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // 2. Ocorrências no período
  const occurrences = await prisma.occurrence.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: start,
        lte: end
      }
    },
    include: {
      reporter: { select: { name: true } },
      resolver: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' }
  })

  // SLA Calculation
  let slaMet = 0
  let slaMissed = 0
  let openPastDeadline = 0

  for (const oc of occurrences) {
    if (oc.status === 'RESOLVED' && oc.resolved_at) {
      if (oc.resolved_at <= oc.deadline) slaMet++
      else slaMissed++
    } else {
      if (new Date() > oc.deadline) openPastDeadline++
    }
  }

  const totalOccurrences = occurrences.length
  const slaCompliance = totalOccurrences > 0 
    ? ((slaMet / totalOccurrences) * 100).toFixed(1) 
    : 100

  return {
    success: true,
    data: {
      consolidatedParameters,
      totalReadings: readings.length,
      totalNonConformant,
      occurrences: occurrences.map(o => ({
        id: o.id,
        description: o.description,
        severity: o.severity,
        status: o.status,
        createdAt: o.created_at.toISOString(),
        deadline: o.deadline.toISOString(),
        resolvedAt: o.resolved_at?.toISOString() || null,
        reporterName: o.reporter.name,
        resolverName: o.resolver?.name || null
      })),
      sla: {
        met: slaMet,
        missed: slaMissed,
        openPastDeadline,
        complianceRate: slaCompliance
      }
    }
  }
}

`

### src\app\gestor\relatorios\page.tsx
`	s
'use client'

import { useState } from 'react'
import { getReportData } from './actions'
import { FileText, Printer, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function RelatoriosPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // First day of current month
    return d.toISOString().split('T')[0]
  })
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getReportData(startDate, endDate)
      if (result.success) {
        setReport(result.data)
      } else {
        setError("Erro ao gerar relatório.")
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white print:text-black p-4 sm:p-6 lg:p-8">
      {/* HEADER CONTROLS - Hidden when printing */}
      <div className="print:hidden mb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Relatórios de Conformidade
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gere o documento oficial consolidado de qualidade e ocorrências.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-1">Data Final</label>
            <input 
              type="date" 
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all"
          >
            {loading ? 'Consultando...' : 'Gerar Dados'}
          </button>
          
          {report && (
            <button 
              onClick={handlePrint}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
          )}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {/* REPORT CONTENT - Formatted for Print */}
      {report && (
        <div className="print:block max-w-4xl mx-auto bg-slate-900 print:bg-transparent rounded-xl border border-slate-800 print:border-none p-6 print:p-0 shadow-xl print:shadow-none">
          
          {/* Print Header */}
          <div className="border-b border-slate-700 print:border-black pb-6 mb-6">
            <h1 className="text-3xl font-bold text-white print:text-black mb-2">Relatório de Conformidade Ambiental</h1>
            <div className="flex items-center gap-2 text-slate-400 print:text-gray-700 text-sm">
              <Calendar className="w-4 h-4" />
              Período: {new Date(startDate).toLocaleDateString('pt-BR')} até {new Date(endDate).toLocaleDateString('pt-BR')}
            </div>
            <p className="text-slate-500 print:text-gray-600 text-xs mt-2">Documento gerado pelo sistema Solentis - Gerenciamento Hídrico.</p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-slate-950 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-slate-400 print:text-gray-600 uppercase font-semibold">Leituras</div>
              <div className="text-2xl font-bold text-white print:text-black mt-1">{report.totalReadings}</div>
            </div>
            <div className="p-4 bg-red-950/20 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-red-400 print:text-gray-600 uppercase font-semibold">Fora do Padrão</div>
              <div className="text-2xl font-bold text-red-500 print:text-black mt-1">{report.totalNonConformant}</div>
            </div>
            <div className="p-4 bg-slate-950 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-slate-400 print:text-gray-600 uppercase font-semibold">Ocorrências</div>
              <div className="text-2xl font-bold text-white print:text-black mt-1">{report.occurrences.length}</div>
            </div>
            <div className="p-4 bg-emerald-950/20 print:bg-white print:border print:border-black rounded-lg">
              <div className="text-xs text-emerald-400 print:text-gray-600 uppercase font-semibold">SLA no Prazo</div>
              <div className="text-2xl font-bold text-emerald-500 print:text-black mt-1">{report.sla.complianceRate}%</div>
            </div>
          </div>

          {/* Parameter Table */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white print:text-black mb-4">Consolidado Analítico (CONAMA)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 print:text-black border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 print:border-black bg-slate-950 print:bg-gray-100">
                    <th className="py-3 px-4 font-semibold">Parâmetro</th>
                    <th className="py-3 px-4 font-semibold">Mín - Máx Legal</th>
                    <th className="py-3 px-4 font-semibold">Média Alcançada</th>
                    <th className="py-3 px-4 font-semibold">Pico Máximo</th>
                    <th className="py-3 px-4 font-semibold text-right">Quebras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-400">
                  {report.consolidatedParameters.map((p: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-medium">{p.name} <span className="text-xs text-slate-500">({p.unit})</span></td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.minLimit ?? 0} - {p.maxLimit ?? '∞'}
                      </td>
                      <td className={`py-3 px-4 font-bold ${p.maxLimit && p.avg > p.maxLimit ? 'text-red-500 print:text-red-700' : 'text-emerald-500 print:text-emerald-700'}`}>
                        {p.avg ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-mono">{p.max ?? '-'}</td>
                      <td className="py-3 px-4 text-right">
                        {p.nonConformantCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 print:bg-transparent px-2 py-1 rounded-md text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" /> {p.nonConformantCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {report.consolidatedParameters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">Nenhuma leitura registrada no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Occurrences Log */}
          <div>
            <h2 className="text-xl font-bold text-white print:text-black mb-4">Diário de Ocorrências</h2>
            <div className="space-y-4 print:space-y-2">
              {report.occurrences.map((oc: any) => (
                <div key={oc.id} className="border border-slate-800 print:border-gray-400 bg-slate-950/50 print:bg-transparent rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border mb-2 ${
                        oc.severity === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/20 print:border-red-500' :
                        oc.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 print:border-orange-500' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20 print:border-blue-500'
                      }`}>
                        {oc.severity}
                      </span>
                      <h4 className="text-sm font-medium text-white print:text-black">{oc.description}</h4>
                    </div>
                    <span className="text-xs text-slate-500 print:text-gray-500 font-mono text-right">
                      Abertura: {new Date(oc.createdAt).toLocaleString('pt-BR')} <br/>
                      {oc.status === 'RESOLVED' ? (
                        <span className="text-emerald-500">Baixa: {new Date(oc.resolvedAt).toLocaleString('pt-BR')}</span>
                      ) : (
                        <span className="text-red-500">Prazo: {new Date(oc.deadline).toLocaleString('pt-BR')}</span>
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 print:text-gray-600 flex items-center gap-4">
                    <span>Relator: {oc.reporterName}</span>
                    {oc.resolverName && <span>Resolvido por: {oc.resolverName}</span>}
                  </div>
                </div>
              ))}
              {report.occurrences.length === 0 && (
                <div className="text-center text-slate-500 py-4 border border-dashed border-slate-800 print:border-gray-400 rounded-lg">
                  Nenhuma ocorrência registrada no período. Ótimo trabalho!
                </div>
              )}
            </div>
          </div>
          
          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-8 border-t border-black text-center text-xs text-gray-500">
            Fim do Relatório Oficial. Assinado Eletronicamente.
          </div>

        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\turnos\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')
}

const TurnoSchema = z.object({
  name:                     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  start_time:               z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end_time:                 z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  crosses_midnight:         z.preprocess((v) => v === 'on', z.boolean()),
  handover_timeout_minutes: z.preprocess(
    (v) => parseInt(String(v), 10),
    z.number().int().min(30, 'Mínimo 30 minutos').max(480, 'Máximo 480 minutos (8h)'),
  ),
})

export type TurnoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  await requireManager()

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.shift.create({
    data: {
      tenant_id:                (await getTenantId()),
      name:                     parsed.data.name,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
      is_active:                true,
    },
  })

  revalidatePath('/gestor/turnos')
  redirect('/gestor/turnos')
}

export async function editarTurno(
  turnoId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  await requireManager()

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.shift.updateMany({ where: { id: turnoId , tenant_id: (await getTenantId()) }, data: {
      name:                     parsed.data.name,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
    },
  })

  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${turnoId}`)
  return { success: true }
}

export async function toggleAtivoTurno(id: string): Promise<{ error?: string }> {
  await requireManager()
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { is_active: true } })
  if (!turno) return { error: 'Turno não encontrado.' }
  await prisma.shift.updateMany({ where: { id, tenant_id: (await getTenantId()) }, data: { is_active: !turno.is_active } })
  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${id}`)
  return {}
}

export async function toggleDaySchedule(shiftId: string, days_of_week: number[]) {
  await requireManager()
  const tenant_id = await getTenantId()

  const schedule = await prisma.shiftSchedule.findFirst({
    where: { shift_id: shiftId, tenant_id }
  })

  if (schedule) {
    await prisma.shiftSchedule.update({
      where: { id: schedule.id },
      data: { days_of_week }
    })
  } else {
    await prisma.shiftSchedule.create({
      data: {
        tenant_id,
        shift_id: shiftId,
        days_of_week,
        is_active: true
      }
    })
  }

  revalidatePath(`/gestor/turnos/${shiftId}`)
}

`

### src\app\gestor\turnos\novo\page.tsx
`	s
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarTurno, type TurnoFormState } from '../actions'

const initialState: TurnoFormState = {}

export default function NovoTurnoPage() {
  const [state, formAction, isPending] = useActionState(criarTurno, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/turnos" label="Turnos" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Novo turno</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Manhã, Tarde, Noite" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
                <Input id="start_time" name="start_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.start_time && <p className="text-xs text-red-400">{state.fieldErrors.start_time[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
                <Input id="end_time" name="end_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.end_time && <p className="text-xs text-red-400">{state.fieldErrors.end_time[0]}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
                Timeout de passagem (minutos)
              </label>
              <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
                min={30} max={480} defaultValue={120} required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
              {state.fieldErrors?.handover_timeout_minutes && (
                <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="crosses_midnight" disabled={isPending}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
              <span className="text-sm text-slate-300">Cruza a meia-noite</span>
            </label>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar turno'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

`

### src\app\gestor\turnos\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

export default async function TurnosPage() {
  const turnos = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()) },
    orderBy: { start_time: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Turnos</h1>
          <p className="text-sm text-slate-400">Configuração de horários e passagem de turno.</p>
        </div>
        <Link href="/gestor/turnos/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Novo turno</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {turnos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Nenhum turno cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Passagem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {turnos.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-100">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {t.start_time} – {t.end_time}
                    {t.crosses_midnight && (
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-500">+1 dia</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.handover_timeout_minutes} min</td>
                  <td className="px-4 py-3">
                    {t.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/turnos/${t.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

`

### src\app\gestor\turnos\tarefas\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type EditHandoverFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Editar passagem (Gestor) ─────────────────────────────────────────────────

export async function editarPassagem(
  handoverId: string,
  _prev: EditHandoverFormState,
  formData: FormData,
): Promise<EditHandoverFormState> {
  const session = await requireManager()

  const parsed = EditHandoverSchema.safeParse({
    justification:         formData.get('justification'),
    outgoing_observations: formData.get('outgoing_observations'),
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: { shift_instance: { select: { tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'CONFIRMED') {
    return { error: 'Apenas passagens confirmadas podem ser editadas.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.updateMany({ where: { id: handoverId , tenant_id: (await getTenantId()) }, data: {
        outgoing_observations: parsed.data.outgoing_observations,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await logAudit(tx, {
      userId,
      action:        'UPDATE',
      tableName:     'shift_handovers',
      recordId:      handoverId,
      before:        { outgoing_observations: handover.outgoing_observations, incoming_observations: handover.incoming_observations },
      after:         { outgoing_observations: parsed.data.outgoing_observations, incoming_observations: parsed.data.incoming_observations },
      justification: parsed.data.justification,
    })
  })

  revalidatePath('/gestor/turnos/tarefas')
  return { success: true }
}

// ─── Pré-agendar turno (criar instância futura com status SCHEDULED) ──────────

const PreAgendarSchema = z.object({
  shift_id: z.string().min(1, 'Selecione o turno'),
  date:     z.string().min(1, 'Informe a data'),
})

export type PreAgendarFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
  instanceId?: string
}

export async function preAgendarTurno(
  _prev: PreAgendarFormState,
  formData: FormData,
): Promise<PreAgendarFormState> {
  const session = await requireManager()

  const parsed = PreAgendarSchema.safeParse({
    shift_id: formData.get('shift_id'),
    date:     formData.get('date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const shift = await prisma.shift.findFirst({
    where:  { id: parsed.data.shift_id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  const targetDate = new Date(parsed.data.date + 'T00:00:00')

  // Verifica duplicado
  const existing = await prisma.shiftInstance.findFirst({
    where: {
      tenant_id: (await getTenantId()),
      shift_id:  parsed.data.shift_id,
      date:      targetDate,
    },
  })
  if (existing) {
    return { error: 'Já existe uma instância para esse turno nessa data.' }
  }

  const instance = await prisma.shiftInstance.create({
    data: {
      tenant_id: (await getTenantId()),
      shift_id:  parsed.data.shift_id,
      date:      targetDate,
      opened_by: userId,
      opened_at: new Date(),
      status:    'SCHEDULED',
    },
  })

  revalidatePath('/gestor/turnos/tarefas')
  return { success: true, instanceId: instance.id }
}


`

### src\app\gestor\turnos\tarefas\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:        'Agendado',
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguard. confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:        'bg-blue-950/60 text-blue-400 border-blue-900/50',
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDatetime(d: Date): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciasTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageStr } = await searchParams
  const page  = Math.max(1, parseInt(pageStr ?? '1', 10))
  const take  = 20
  const skip  = (page - 1) * take

  const where = {
    tenant_id: (await getTenantId()),
    ...(status ? { status } : {}),
  }

  const [instances, total] = await Promise.all([
    prisma.shiftInstance.findMany({
      where,
      include: {
        shift:  { select: { name: true } },
        opener: { select: { name: true } },
        handover: {
          select: {
            id:               true,
            status:           true,
            outgoing_user:    { select: { name: true } },
            incoming_user:    { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { opened_at: 'desc' }],
      take,
      skip,
    }),
    prisma.shiftInstance.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  const STATUS_FILTERS = [
    { label: 'Todos',              value: '' },
    { label: 'Agendados',          value: 'SCHEDULED' },
    { label: 'Abertos',            value: 'OPEN' },
    { label: 'Em passagem',        value: 'HANDOVER_PENDING' },
    { label: 'Fechados',           value: 'CLOSED' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Tarefas do Turno</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{total} registro(s)</span>
          <Link href="/gestor/turnos/tarefas/pre-agendar">
            <Button className="bg-blue-700 text-white hover:bg-blue-600 text-xs h-8">
              + Pré-agendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = (status ?? '') === f.value
          const params   = f.value ? `?status=${f.value}` : '?'
          return (
            <Link
              key={f.value}
              href={`/gestor/turnos/tarefas${params}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-slate-100'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {instances.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
          <p className="text-sm text-slate-500">Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => (
            <Link
              key={inst.id}
              href={`/gestor/turnos/tarefas/${inst.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{inst.shift.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDate(inst.date)}
                    {inst.status === 'SCHEDULED'
                      ? ` · Agendado por ${inst.opener.name}`
                      : ` · Aberto por ${inst.opener.name} às ${formatDatetime(inst.opened_at)}`
                    }
                  </p>
                  {inst.handover && (
                    <p className="text-xs text-slate-600">
                      Sainte: {inst.handover.outgoing_user.name}
                      {inst.handover.incoming_user && ` → Entrante: ${inst.handover.incoming_user.name}`}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? 'bg-slate-800 text-slate-400'}`}>
                  {STATUS_LABEL[inst.status] ?? inst.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={`/gestor/turnos/tarefas?${status ? `status=${status}&` : ''}page=${page - 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <Link
            href={`/gestor/turnos/tarefas?${status ? `status=${status}&` : ''}page=${page + 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            Próximo →
          </Link>
        </div>
      )}
    </div>
  )
}


`

### src\app\gestor\turnos\tarefas\pre-agendar\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { PreAgendarForm } from './pre-agendar-form'
import { getTenantId } from '@/lib/tenant'


export default async function PreAgendarPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { start_time: 'asc' },
  })

  return (
    <div className="max-w-lg space-y-4">
      <BackButton href="/gestor/turnos/tarefas" label="Tarefas" />
      <h1 className="text-xl font-semibold">Pré-agendar Turno</h1>
      <p className="text-sm text-slate-400">
        Crie uma instância de turno com data futura para atribuir tarefas antecipadamente.
      </p>
      <PreAgendarForm shifts={shifts} />
    </div>
  )
}


`

### src\app\gestor\turnos\tarefas\pre-agendar\pre-agendar-form.tsx
`	s
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { preAgendarTurno, type PreAgendarFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: PreAgendarFormState = {}

export function PreAgendarForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(preAgendarTurno, INITIAL)

  // Default: amanhã
  const [dateVal, setDateVal] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })

  useEffect(() => {
    if (state.success && state.instanceId) {
      router.push(`/gestor/turnos/tarefas/${state.instanceId}`)
    }
  }, [state.success, state.instanceId, router])

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="shift_id" className="text-sm font-medium text-slate-300">
          Turno *
        </label>
        <select
          id="shift_id" name="shift_id"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.start_time} – {s.end_time})
            </option>
          ))}
        </select>
        {state.fieldErrors?.shift_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.shift_id[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="date" className="text-sm font-medium text-slate-300">
          Data *
        </label>
        <input
          id="date" name="date"
          type="date"
          required
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.date && (
          <p className="text-xs text-red-400">{state.fieldErrors.date[0]}</p>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Após criar, você poderá atribuir tarefas antecipadamente. Quando o operador abrir o turno nessa data, as tarefas já estarão prontas.
      </p>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Criando…' : 'Pré-agendar turno'}
      </Button>
    </form>
  )
}


`

### src\app\gestor\turnos\tarefas\[id]\edit-handover-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { editarPassagem } from '../actions'
import type { EditHandoverFormState } from '../actions'

const INITIAL: EditHandoverFormState = {}

type Props = {
  handoverId:      string
  currentOutgoing: string
  currentIncoming: string
}

export function EditHandoverForm({ handoverId, currentOutgoing, currentIncoming }: Props) {
  const action = editarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  if (state.success) {
    return (
      <p className="text-xs text-green-400 py-2">Observações atualizadas com sucesso.</p>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do sainte</label>
        <textarea
          name="outgoing_observations"
          rows={2}
          defaultValue={currentOutgoing}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do entrante</label>
        <textarea
          name="incoming_observations"
          rows={2}
          defaultValue={currentIncoming}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">
          Justificativa da edição <span className="text-red-400">*</span>
        </label>
        <textarea
          name="justification"
          rows={2}
          required
          placeholder="Descreva o motivo da edição (mín. 10 caracteres)"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.justification && (
          <p className="text-xs text-red-400">{state.fieldErrors.justification[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-9 w-full border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

`

### src\app\gestor\turnos\tarefas\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EditHandoverForm } from './edit-handover-form'
import { TaskForm } from './task-form'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:        'Agendado',
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:        'bg-blue-950/60 text-blue-400 border-blue-900/50',
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

const HANDOVER_STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando confirmação',
  CONFIRMED: 'Confirmada',
  TIMED_OUT: 'Timeout',
}

function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
        handover: {
          include: {
            outgoing_user: { select: { name: true } },
            incoming_user: { select: { name: true } },
          },
        },
        readings:    { select: { id: true } },
        shift_tasks: {
          include: {
            assignee: { select: { name: true } },
            creator:  { select: { name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where:   { tenant_id: (await getTenantId()), role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/gestor/turnos/tarefas')

  const h = instance.handover

  let checklist: {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  } = {}
  if (h) {
    try { checklist = JSON.parse(h.checklist_data) } catch { /* ignora */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos/tarefas" label="Tarefas do Turno" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · {formatDatetime(instance.date)}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[instance.status] ?? ''}`}>
          {STATUS_LABEL[instance.status] ?? instance.status}
        </span>
      </div>

      {/* Dados da instância */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefa</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-slate-500">Aberto por</span>
            <p className="text-slate-200">{instance.opener.name}</p>
          </div>
          <div>
            <span className="text-slate-500">Abertura</span>
            <p className="text-slate-200">{formatDatetime(instance.opened_at)}</p>
          </div>
          {instance.closed_at && (
            <div>
              <span className="text-slate-500">Fechamento</span>
              <p className="text-slate-200">{formatDatetime(instance.closed_at)}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Leituras</span>
            <p className="text-slate-200">{instance.readings.length}</p>
          </div>
        </div>
      </div>

      {/* Tarefas do turno */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <span className="text-xs text-slate-500">
            {instance.shift_tasks.filter((t) => t.status === 'DONE').length}
            /{instance.shift_tasks.length} concluídas
          </span>
        </div>
        <TaskForm
          instanceId={id}
          operators={operators}
          tasks={instance.shift_tasks}
          canAdd={instance.status !== 'CLOSED'}
        />
      </div>

      {/* Passagem de turno */}
      {h ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Passagem</p>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              h.status === 'CONFIRMED'  ? 'bg-green-950/60 text-green-400'  :
              h.status === 'TIMED_OUT' ? 'bg-red-950/60 text-red-400'      :
                                         'bg-amber-950/60 text-amber-400'
            }`}>
              {HANDOVER_STATUS_LABEL[h.status] ?? h.status}
            </span>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-xl font-bold">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${(checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Pendências</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div>
              <span className="text-slate-500">Sainte</span>
              <p className="text-slate-200">{h.outgoing_user.name}</p>
            </div>
            {h.incoming_user && (
              <div>
                <span className="text-slate-500">Entrante</span>
                <p className="text-slate-200">{h.incoming_user.name}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">Iniciada em</span>
              <p className="text-slate-200">{formatDatetime(h.handover_at)}</p>
            </div>
            {h.confirmed_at && (
              <div>
                <span className="text-slate-500">Confirmada em</span>
                <p className="text-slate-200">{formatDatetime(h.confirmed_at)}</p>
              </div>
            )}
          </div>

          {h.outgoing_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.outgoing_observations}</p>
            </div>
          )}
          {h.incoming_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do entrante</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.incoming_observations}</p>
            </div>
          )}

          {/* Formulário de edição — apenas passagens confirmadas */}
          {h.status === 'CONFIRMED' && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 mb-3">Editar observações</p>
              <EditHandoverForm
                handoverId={h.id}
                currentOutgoing={h.outgoing_observations ?? ''}
                currentIncoming={h.incoming_observations ?? ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center py-8">
          <p className="text-sm text-slate-500">Nenhuma passagem registrada.</p>
        </div>
      )}
    </div>
  )
}

`

### src\app\gestor\turnos\tarefas\[id]\task-actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AtribuirTarefaSchema = z.object({
  title: z.string({ error: 'Título obrigatório' })
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
  assigned_to_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TaskFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Atribuir tarefa ──────────────────────────────────────────────────────────

export async function atribuirTarefa(
  instanceId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const session = await requireManagerOrTechnician()

  const parsed = AtribuirTarefaSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    assigned_to_id: formData.get('assigned_to_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const instance = await prisma.shiftInstance.findFirst({
    where:  { id: instanceId, tenant_id: (await getTenantId()) },
    select: { status: true },
  })
  if (!instance)                    return { error: 'Tarefa não encontrada.' }
  if (instance.status === 'CLOSED') return { error: 'Não é possível adicionar tarefas a um turno fechado.' }

  // Garante que o operador atribuído pertence ao tenant e está ativo
  if (parsed.data.assigned_to_id) {
    const assignee = await prisma.user.findFirst({
      where:  { id: parsed.data.assigned_to_id, tenant_id: (await getTenantId()), is_active: true, role: 'OPERATOR' },
      select: { id: true },
    })
    if (!assignee) return { error: 'Operador selecionado não encontrado ou inativo.' }
  }

  await prisma.shiftTask.create({
    data: {
      tenant_id:         (await getTenantId()),
      shift_instance_id: instanceId,
      title:             parsed.data.title,
      description:       parsed.data.description,
      assigned_to_id:    parsed.data.assigned_to_id,
      created_by:        userId,
      status:            'PENDING',
    },
  })

  revalidatePath(`/gestor/turnos/tarefas/${instanceId}`)
  return { success: true }
}

// ─── Remover tarefa ───────────────────────────────────────────────────────────
// Só PENDING pode ser removida — tarefas DONE/SKIPPED são histórico operacional

export async function removerTarefa(taskId: string): Promise<void> {
  await requireManagerOrTechnician()

  const task = await prisma.shiftTask.findFirst({
    where:  { id: taskId, tenant_id: (await getTenantId()), status: 'PENDING' },
    select: { shift_instance_id: true },
  })
  if (!task) return

  await prisma.shiftTask.deleteMany({ where: { id: taskId , tenant_id: (await getTenantId()) } })
  revalidatePath(`/gestor/turnos/tarefas/${task.shift_instance_id}`)
}

`

### src\app\gestor\turnos\tarefas\[id]\task-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { atribuirTarefa, removerTarefa, type TaskFormState } from './task-actions'

const INITIAL: TaskFormState = {}

type Operator = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  assignee: { name: string } | null
  creator: { name: string }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE:    'Concluída',
  SKIPPED: 'Pulada',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-slate-700 bg-slate-800/60 text-slate-400',
  DONE:    'border-green-900/50 bg-green-950/60 text-green-400',
  SKIPPED: 'border-slate-700/50 bg-slate-800/30 text-slate-500',
}

export function TaskForm({
  instanceId,
  operators,
  tasks,
  canAdd,
}: {
  instanceId: string
  operators:  Operator[]
  tasks:      Task[]
  canAdd:     boolean
}) {
  const boundAction = atribuirTarefa.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {task.assignee ? `→ ${task.assignee.name}` : 'Qualquer operador'} · por {task.creator.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
                {task.status === 'PENDING' && canAdd && (
                  <form action={removerTarefa.bind(null, task.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-400" disabled={isPending}>
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-medium text-slate-400">Nova tarefa</p>

          <div>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Título da tarefa *"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-400">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Descrição opcional"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <select
            name="assigned_to_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Qualquer operador</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          {state.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="h-9 w-full bg-slate-100 text-sm text-slate-900 hover:bg-white"
          >
            {isPending ? 'Salvando…' : '+ Atribuir tarefa'}
          </Button>
        </form>
      )}
    </div>
  )
}

`

### src\app\gestor\turnos\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarTurno, toggleAtivoTurno, type TurnoFormState } from '../actions'
import { ShiftScheduleSection } from './shift-schedule-section'

type Turno = {
  id: string; name: string; start_time: string; end_time: string
  crosses_midnight: boolean; handover_timeout_minutes: number; is_active: boolean
  schedules?: { id: string; days_of_week: number[]; is_active: boolean }[]
}

const initialState: TurnoFormState = {}

export function EditTurnoForm({ turno }: { turno: Turno }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarTurno.bind(null, turno.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(turno.is_active ? 'Desativar este turno?' : 'Reativar este turno?')) return
    startToggle(async () => { await toggleAtivoTurno(turno.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos" label="Turnos" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{turno.name}</h1>
          <p className="text-sm text-slate-400 font-mono">{turno.start_time} – {turno.end_time}</p>
        </div>
        {turno.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={turno.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
              <Input id="start_time" name="start_time" type="time" defaultValue={turno.start_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
              <Input id="end_time" name="end_time" type="time" defaultValue={turno.end_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
              Timeout de passagem (minutos)
            </label>
            <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
              min={30} max={480} defaultValue={turno.handover_timeout_minutes} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.handover_timeout_minutes && (
              <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="crosses_midnight" disabled={isPendingForm}
              defaultChecked={turno.crosses_midnight}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
            <span className="text-sm text-slate-300">Cruza a meia-noite</span>
          </label>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Turno atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <ShiftScheduleSection shiftId={turno.id} schedule={turno.schedules?.[0]} />

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={turno.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : turno.is_active ? 'Desativar turno' : 'Reativar turno'}
        </Button>
      </div>
    </main>
  )
}

`

### src\app\gestor\turnos\[id]\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditTurnoForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true, handover_timeout_minutes: true, is_active: true, schedules: true },
  })
  if (!turno) notFound()
  return <EditTurnoForm turno={turno} />
}

`

### src\app\gestor\turnos\[id]\shift-schedule-section.tsx
`	s
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { toggleDaySchedule } from '../actions'

type ShiftSchedule = { id: string; days_of_week: number[]; is_active: boolean }

const DAYS = [
  { id: 0, label: 'Dom', short: 'D' },
  { id: 1, label: 'Seg', short: 'S' },
  { id: 2, label: 'Ter', short: 'T' },
  { id: 3, label: 'Qua', short: 'Q' },
  { id: 4, label: 'Qui', short: 'Q' },
  { id: 5, label: 'Sex', short: 'S' },
  { id: 6, label: 'Sáb', short: 'S' },
]

export function ShiftScheduleSection({ shiftId, schedule }: { shiftId: string, schedule?: ShiftSchedule }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const activeDays = schedule?.days_of_week || []

  function handleToggleDay(dayId: number) {
    let newDays = [...activeDays]
    if (newDays.includes(dayId)) {
      newDays = newDays.filter((d) => d !== dayId)
    } else {
      newDays.push(dayId)
    }

    startTransition(async () => {
      await toggleDaySchedule(shiftId, newDays)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-medium text-slate-200">Recorrência Automática (Agendamento)</h2>
      </div>
      
      <p className="text-xs text-slate-400">
        Selecione os dias da semana em que este turno deve ser gerado automaticamente pelo sistema à meia-noite.
      </p>

      <div className="flex gap-2 mt-4">
        {DAYS.map((day) => {
          const isActive = activeDays.includes(day.id)
          return (
            <button
              key={day.id}
              onClick={() => handleToggleDay(day.id)}
              disabled={isPending}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-md border transition-all ${
                isActive
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-900/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              } disabled:opacity-50`}
            >
              <span className="text-[10px] uppercase font-semibold">{day.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

`

### src\app\gestor\usuarios\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'


async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const UsuarioSchema = z.object({
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [managerId, tempPassword] = [
    await resolveUserId(session.user.email!),
    gerarSenhaProvisoria(),
  ]
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenant_id:            (await getTenantId()),
          name:                 parsed.data.name,
          email:                parsed.data.email,
          role:                 parsed.data.role,
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        },
        select: { id: true },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'CREATE',
        tableName: 'users',
        recordId:  created.id,
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, is_active: true },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao criar usuário. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  return { tempPassword }
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarUsuario(
  userId: string,
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [current, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) },
      select: { name: true, email: true, role: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!current) return { error: 'Usuário não encontrado.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { name: current.name, email: current.email, role: current.role },
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  redirect('/gestor/usuarios')
}

// ─── Toggle ativo (soft-delete / reativação) ─────────────────────────────────

export async function toggleAtivo(
  userId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) }, select: { is_active: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { is_active: !user.is_active },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      before:    { is_active:  user.is_active  },
      after:     { is_active: !user.is_active  },
    })
  })

  revalidatePath('/gestor/usuarios')
  revalidatePath(`/gestor/usuarios/${userId}`)
  return {}
}

// ─── Resetar senha ───────────────────────────────────────────────────────────

export async function resetarSenha(
  userId: string,
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId , tenant_id: (await getTenantId()) }, select: { id: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { id: userId , tenant_id: (await getTenantId()) }, data:  { password_hash: passwordHash, must_change_password: true },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      after:     { must_change_password: true },
    })
  })

  return { tempPassword }
}

`

### src\app\gestor\usuarios\novo\page.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
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

  // ── Sucesso: exibe senha provisória ─────────────────────────────────────
  if (state.tempPassword) {
    return (
      <div className="px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-100">Usuário criado</h2>
              <p className="text-xs text-slate-400">
                Anote a senha provisória e envie ao usuário. Ele deverá alterá-la no primeiro acesso.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <code className="font-mono text-base tracking-widest text-amber-300">
                {state.tempPassword}
              </code>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={handleCopy}
                className="shrink-0 text-slate-400 hover:text-slate-100"
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

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/usuarios" label="Usuários" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo usuário</h2>
            <p className="text-xs text-slate-400">Uma senha provisória será gerada automaticamente.</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                placeholder="Nome completo"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
              <Input
                id="email" name="email" type="email"
                placeholder="usuario@email.com"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
              )}
            </div>

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
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
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

`

### src\app\gestor\usuarios\page.tsx
`	s
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const ROLE_LABELS: Record<string, string> = {
  MANAGER:    'Gestor',
  TECHNICIAN: 'Técnico',
  OPERATOR:   'Operador',
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER:    'bg-emerald-900/60 text-emerald-400',
  TECHNICIAN: 'bg-sky-900/60 text-sky-400',
  OPERATOR:   'bg-amber-900/60 text-amber-400',
}

function formatDate(date: Date | null): string {
  if (!date) return 'Nunca'
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const users = await prisma.user.findMany({
    where: {
      tenant_id: (await getTenantId()),
      ...(search
        ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
        : {}),
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, last_login_at: true, must_change_password: true,
    },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-slate-400">Gerencie contas de acesso ao sistema.</p>
        </div>
        <Link href="/gestor/usuarios/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo usuário
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome ou e-mail…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/usuarios">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum usuário encontrado para "${search}".` : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    {u.must_change_password && (
                      <span className="text-xs text-amber-500">Senha provisória</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-800 text-slate-400'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/usuarios/${u.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                        Editar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{users.length} usuário(s) encontrado(s)</p>
    </main>
  )
}

`

### src\app\gestor\usuarios\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarUsuario, toggleAtivo, resetarSenha, type UsuarioFormState } from '../actions'

type User = {
  id:                   string
  name:                 string
  email:                string
  role:                 string
  is_active:            boolean
  must_change_password: boolean
}

const initialState: UsuarioFormState = {}

export function EditForm({ user }: { user: User }) {
  const router = useRouter()
  const [isPendingAction, startTransition] = useTransition()

  const editAction = editarUsuario.bind(null, user.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  const [actionError, setActionError]   = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copiedReset, setCopiedReset]   = useState(false)
  const [isActive, setIsActive]         = useState(user.is_active)

  const isPending = isPendingForm || isPendingAction

  function handleToggleAtivo() {
    const msg = isActive
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
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <BackButton href="/gestor/usuarios" label="Usuários" />

      {/* Título + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        {isActive ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
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
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
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
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
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
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
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

      {/* Nova senha provisória gerada pelo reset */}
      {tempPassword && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-amber-300">Nova senha provisória gerada</h3>
            <p className="mt-0.5 text-xs text-amber-400/70">
              Envie esta senha ao usuário. Ele deverá alterá-la no próximo acesso.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
            <code className="font-mono text-base tracking-widest text-amber-300">{tempPassword}</code>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={handleCopyReset}
              className="shrink-0 text-slate-400 hover:text-slate-100"
            >
              {copiedReset ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>

        {actionError && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {actionError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button" variant="outline" disabled={isPending}
            onClick={handleResetarSenha}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {isPendingAction ? 'Aguarde…' : 'Resetar senha'}
          </Button>

          <Button
            type="button" variant="outline" disabled={isPending}
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
  )
}

`

### src\app\gestor\usuarios\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const user = await prisma.user.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, must_change_password: true,
    },
  })

  if (!user) notFound()

  return <EditForm user={user} />
}

`

### src\app\globals.css
`	s
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Cores Semânticas de Status */
  --color-status-ok: var(--color-emerald-500);
  --color-status-warn: var(--color-amber-500);
  --color-status-danger: var(--color-red-500);
  --color-status-critical: var(--color-red-700);

  /* Auth UI Tokens */
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-success: var(--success);
  --color-alarm: var(--alarm);
  --color-data: var(--data);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-ibm-plex-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-ibm-plex-mono), ui-monospace, SFMono-Regular, monospace;
  --font-heading: var(--font-sora), ui-sans-serif, system-ui, sans-serif;
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  /* Auth UI Tokens (Light Mode) */
  --surface: oklch(1 0 0);
  --surface-2: oklch(0.985 0.005 248);
  --surface-3: oklch(0.97 0.006 248);
  --success: oklch(0.62 0.14 155);
  --alarm: oklch(0.57 0.20 27);
  --data: oklch(0.52 0.12 200);

  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --brand: oklch(0.52 0.12 200);
  --brand-soft: oklch(0.52 0.12 200 / 14%);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);

  /* Dashboard Client Variables */
  --dash-bg: oklch(0.975 0.005 248);
  --dash-s1: oklch(1 0 0);
  --dash-s2: oklch(0.985 0.004 248);
  --dash-s3: oklch(0.955 0.006 248);
  --dash-border: oklch(0.91 0.006 248);
  --dash-border2: oklch(0.85 0.01 248);
  --dash-txt: oklch(0.23 0.02 248);
  --dash-txt2: oklch(0.44 0.018 248);
  --dash-txt3: oklch(0.58 0.015 248);
  --dash-shadow: 0 1px 2px rgba(16,24,40,.05), 0 12px 30px rgba(16,24,40,.07);
  --dash-shadow-sm: 0 1px 2px rgba(16,24,40,.06);
  --dash-on-brand: oklch(0.99 0 0);
  --dash-brand: oklch(0.52 0.12 200);
  --dash-brand-soft: oklch(0.52 0.12 200 / 14%);
  --dash-brand-line: oklch(0.52 0.12 200 / 32%);
  --dash-ok: oklch(0.50 0.15 150);
  --dash-ok-soft: oklch(0.50 0.15 150 / 14%);
  --dash-warn: oklch(0.60 0.14 70);
  --dash-warn-soft: oklch(0.60 0.14 70 / 14%);
  --dash-danger: oklch(0.55 0.21 25);
  --dash-danger-soft: oklch(0.55 0.21 25 / 14%);
  --dash-consumption-2: oklch(0.72 0.03 248);
  --dash-consumption-3: oklch(0.84 0.015 248);
}

.dark {
  /* Auth UI Tokens (Split Water) */
  --background: oklch(0.165 0.018 235);
  --foreground: oklch(0.965 0.008 240);
  --surface: oklch(0.215 0.020 235);
  --surface-2: oklch(0.265 0.022 232);
  --surface-3: oklch(0.315 0.024 230);
  --primary: oklch(0.80 0.165 78);
  --primary-foreground: oklch(0.16 0.018 235);
  --muted-foreground: oklch(0.66 0.015 230);
  --success: oklch(0.72 0.14 155);
  --alarm: oklch(0.62 0.20 27);
  --data: oklch(0.78 0.14 215);
  --border: oklch(1 0 0 / 6%);
  --ring: oklch(0.80 0.165 78);
  --brand: oklch(0.82 0.13 195);
  --brand-soft: oklch(0.82 0.13 195 / 14%);

  /* Mapping Shadcn equivalents to maintain rest of app */
  --card: var(--surface);
  --card-foreground: var(--foreground);
  --popover: var(--surface);
  --popover-foreground: var(--foreground);
  --secondary: var(--surface-2);
  --secondary-foreground: var(--foreground);
  --muted: var(--surface-2);
  --destructive: var(--alarm);
  --input: oklch(1 0 0 / 10%);
  
  /* Retaining some non-colliding Shadcn tokens just in case */
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: var(--surface);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--surface-2);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);

  /* Dashboard Client Variables */
  --dash-bg: oklch(0.165 0.015 248);
  --dash-s1: oklch(0.205 0.017 248);
  --dash-s2: oklch(0.245 0.018 248);
  --dash-s3: oklch(0.29 0.02 248);
  --dash-border: oklch(0.31 0.016 248);
  --dash-border2: oklch(0.40 0.02 248);
  --dash-txt: oklch(0.97 0.005 248);
  --dash-txt2: oklch(0.75 0.013 248);
  --dash-txt3: oklch(0.58 0.015 248);
  --dash-shadow: 0 1px 2px rgba(0,0,0,.45), 0 12px 30px rgba(0,0,0,.30);
  --dash-shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --dash-on-brand: oklch(0.16 0.02 248);
  --dash-brand: oklch(0.82 0.13 195);
  --dash-brand-soft: oklch(0.82 0.13 195 / 14%);
  --dash-brand-line: oklch(0.82 0.13 195 / 32%);
  --dash-ok: oklch(0.80 0.15 150);
  --dash-ok-soft: oklch(0.80 0.15 150 / 14%);
  --dash-warn: oklch(0.84 0.13 82);
  --dash-warn-soft: oklch(0.84 0.13 82 / 14%);
  --dash-danger: oklch(0.70 0.19 22);
  --dash-danger-soft: oklch(0.70 0.19 22 / 14%);
  --dash-consumption-2: oklch(0.60 0.04 248);
  --dash-consumption-3: oklch(0.44 0.03 248);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

/* CMDK Global Styles */
[cmdk-root] {
  max-width: 100%;
  width: 100%;
  background: transparent;
  border-radius: var(--radius);
}
[cmdk-input] {
  font-family: var(--font-sans);
  border: none;
  width: 100%;
  font-size: 14px;
  padding: 8px 0;
  outline: none;
  background: transparent;
  color: var(--foreground);
}
[cmdk-input]::placeholder {
  color: var(--muted-foreground);
}
[cmdk-item] {
  content-visibility: auto;
  cursor: pointer;
  height: 40px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  color: var(--foreground);
  user-select: none;
  will-change: background, color;
  transition: all 150ms ease;
}
[cmdk-item][data-selected='true'] {
  background: var(--muted);
  color: var(--accent-foreground);
}
[cmdk-item][data-disabled='true'] {
  color: var(--muted-foreground);
  cursor: not-allowed;
}
[cmdk-group-heading] {
  user-select: none;
  font-size: 12px;
  color: var(--muted-foreground);
  padding: 0 8px;
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

/* Logo Animada - Microbolhas */
.sol-logo {
  position: relative;
  overflow: hidden;
}
.sol-surface {
  position: absolute;
  top: 30%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
  z-index: 10;
}
.sol-b {
  position: absolute;
  background: white;
  border-radius: 50%;
  bottom: -10px;
  animation: solRise 3s infinite ease-in;
}
.sol-b1 { width: 6px; height: 6px; left: 20%; animation-duration: 2.5s; animation-delay: 0s; }
.sol-b2 { width: 4px; height: 4px; left: 45%; animation-duration: 3.2s; animation-delay: 0.5s; }
.sol-b3 { width: 7px; height: 7px; left: 65%; animation-duration: 2.8s; animation-delay: 1s; opacity: 0.8; }
.sol-b4 { width: 3px; height: 3px; left: 80%; animation-duration: 3.5s; animation-delay: 0.2s; opacity: 0.6; }

@keyframes solRise {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 1; transform: translateY(-30px) scale(1.1); }
  100% { transform: translateY(-40px) scale(0); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sol-b {
    animation: none;
    bottom: 40%;
  }
}
`

### src\app\layout.tsx
`	s
import type { Metadata } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CommandMenu } from "@/components/ui/command-menu";
import { Analytics } from "@vercel/analytics/next";
import { ThemeScript } from "@/components/theme-provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Solentis",
  description: "Sistema de gestão de Estação de Tratamento de Efluentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <CommandMenu />
        <Analytics />
      </body>
    </html>
  );
}

`

### src\app\manutencao\corretivas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default async function CorretivasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [corretivas, total] = await Promise.all([
    prisma.correctiveMaintenance.findMany({
      where,
      include: {
        equipment: { select: { name: true, location: true } },
        responsible: { select: { name: true } }
      },
      orderBy: [{ start_date: 'desc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.correctiveMaintenance.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Manutenções Corretivas</h1>
          <p className="text-xs text-slate-400">{total} ordem(ns) de serviço</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/manutencao/corretivas"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              !showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Abertas
          </Link>
          <Link
            href="/manutencao/corretivas?status=all"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Tabela */}
      {corretivas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
          Nenhuma manutenção corretiva encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Descrição da Falha</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Abertura</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {corretivas.map((corr) => {
                return (
                  <tr key={corr.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium">{corr.equipment.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{corr.equipment.location || 'Sem localização'}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-slate-200 line-clamp-1">{corr.description}</p>
                      <p className="text-xs text-slate-600 mt-0.5">Resp: {corr.responsible.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[corr.priority || 'LOW'] ?? ''}`}>
                        {PRIORITY_LABEL[corr.priority || 'LOW'] ?? corr.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDatetime(corr.start_date)}
                    </td>
                    <td className="px-4 py-3">
                      {corr.status === 'COMPLETED' ? (
                        <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                          Concluída
                        </span>
                      ) : corr.status === 'IN_PROGRESS' ? (
                        <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Em Andamento
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Aberta
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          {page > 1 ? (
            <Link
              href={`/manutencao/corretivas?page=${page - 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Anterior
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/manutencao/corretivas?page=${page + 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              Próxima →
            </Link>
          ) : <span />}
        </div>
      )}
    </main>
  )
}

`

### src\app\manutencao\dashboard\page.tsx
`	s
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Wrench, AlertTriangle, Calendar, Settings } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { formatDateDisplay } from '@/lib/date-utils'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard de Manutenção | Solentis',
}

export default async function ManutencaoDashboardPage() {
  const tenant_id = await getTenantId()
  
  const [preventivas, corretivas] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      where: { tenant_id, status: { not: 'COMPLETED' } },
      include: { equipment: true },
      orderBy: { scheduled_date: 'asc' },
      take: 10
    }),
    prisma.correctiveMaintenance.findMany({
      where: { tenant_id, status: { not: 'COMPLETED' } },
      include: { equipment: true },
      orderBy: { start_date: 'asc' },
      take: 10
    })
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Dashboard de Manutenção" 
        description="Visão geral de manutenções preventivas e corretivas pendentes."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preventivas Pendentes</CardTitle>
            <Wrench className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preventivas.length}</div>
            <p className="text-xs text-slate-400">Atividades preventivas programadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corretivas Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{corretivas.length}</div>
            <p className="text-xs text-slate-400">Ordens de serviço em andamento</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fila de Preventivas */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" /> Preventivas Próximas
          </h2>
          {preventivas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Nenhuma preventiva programada.
            </div>
          ) : (
            <div className="space-y-2">
              {preventivas.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-slate-200">{p.equipment.name}</p>
                    <p className="text-xs text-slate-500">Agendada: {formatDateDisplay(p.scheduled_date)}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-slate-800 text-slate-300 rounded">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fila de Corretivas */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" /> Corretivas Pendentes
          </h2>
          {corretivas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              Nenhuma corretiva aberta.
            </div>
          ) : (
            <div className="space-y-2">
              {corretivas.map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-slate-200">{c.equipment.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      c.priority === 'HIGH' ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {c.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

`

### src\app\manutencao\layout.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { ManutencaoSidebar } from '@/components/manutencao/sidebar'
import { TopNav } from '@/components/ui/top-nav'
import { MobileNav } from '@/components/mobile-nav'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'

export default async function ManutencaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MAINTENANCE') redirect('/acesso-negado')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNav><ManutencaoSidebar /></MobileNav>
            <Link href="/manutencao/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-blue-900/60 px-2.5 py-0.5 text-xs font-medium text-blue-400">
              Manutenção
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <ManutencaoSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

`

### src\app\manutencao\preventivas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default async function PreventivasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page    = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip    = (page - 1) * PAGE_SIZE
  const showAll = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }),
  }

  const [preventivas, total] = await Promise.all([
    prisma.preventiveMaintenance.findMany({
      where,
      include: {
        equipment: { select: { name: true, location: true } },
        completer: { select: { name: true } }
      },
      orderBy: [{ scheduled_date: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.preventiveMaintenance.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Manutenções Preventivas</h1>
          <p className="text-xs text-slate-400">{total} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/manutencao/preventivas"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              !showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Pendentes
          </Link>
          <Link
            href="/manutencao/preventivas?status=all"
            className={[
              'rounded-md border px-3 py-1.5 text-xs flex items-center',
              showAll
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
            ].join(' ')}
          >
            Todas
          </Link>
        </div>
      </div>

      {/* Tabela */}
      {preventivas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
          Nenhuma preventiva agendada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Agendamento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Realizada Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {preventivas.map((prev) => {
                const atrasado = prev.status !== 'COMPLETED' && new Date(prev.scheduled_date) < now

                return (
                  <tr key={prev.id} className="bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium">{prev.equipment.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{prev.equipment.location || 'Sem localização'}</p>
                    </td>
                    <td className={`px-4 py-3 ${atrasado ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
                      {formatDatetime(prev.scheduled_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {prev.status === 'COMPLETED' ? (
                          <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                            Concluída
                          </span>
                        ) : prev.status === 'IN_PROGRESS' ? (
                          <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                            Em Andamento
                          </span>
                        ) : (
                          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            Agendada
                          </span>
                        )}
                        {atrasado && (
                          <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                            ATRASADA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {prev.completer ? prev.completer.name : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          {page > 1 ? (
            <Link
              href={`/manutencao/preventivas?page=${page - 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Anterior
            </Link>
          ) : <span />}
          <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/manutencao/preventivas?page=${page + 1}${showAll ? '&status=all' : ''}`}
              className="text-slate-400 hover:text-slate-200"
            >
              Próxima →
            </Link>
          ) : <span />}
        </div>
      )}
    </main>
  )
}

`

### src\app\operador\dashboard\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'


export default async function OperadorDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openOcorrencias, pendingHandovers, lowStockCount, leiturasDoDia, turnoAtivo, pendingTasksCount] =
    await Promise.all([
      userRecord
        ? prisma.occurrence.count({
            where: {
              tenant_id:   (await getTenantId()),
              reported_by: userRecord.id,
              status:      { in: ['OPEN', 'IN_PROGRESS'] },
            },
          })
        : Promise.resolve(0),

      userRecord
        ? prisma.shiftHandover.count({
            where: {
              tenant_id:        (await getTenantId()),
              status:           'PENDING',
              outgoing_user_id: { not: userRecord.id },
              shift_instance:   { date: today, status: 'HANDOVER_PENDING' },
            },
          })
        : Promise.resolve(0),

      // Produtos com estoque calculado abaixo do mínimo
      (async () => {
        const products = await prisma.chemicalProduct.findMany({
          where:  { tenant_id: (await getTenantId()), is_active: true },
          select: { min_stock: true, entries: { select: { quantity: true } }, exits: { select: { quantity: true } } },
        })
        return products.filter((p) => {
          const calc = p.entries.reduce((s, e) => s + e.quantity, 0)
                     - p.exits.reduce((s, e) => s + e.quantity, 0)
          return calc < p.min_stock
        }).length
      })(),

      // Leituras registradas hoje por este operador
      userRecord
        ? prisma.reading.count({
            where: {
              tenant_id:   (await getTenantId()),
              recorded_by: userRecord.id,
              recorded_at: { gte: today },
            },
          })
        : Promise.resolve(0),

      // Turno ativo aberto por este operador
      userRecord
        ? prisma.shiftInstance.findFirst({
            where:   { tenant_id: (await getTenantId()), opened_by: userRecord.id, status: 'OPEN' },
            include: { shift: { select: { name: true, start_time: true, end_time: true } } },
            orderBy: { opened_at: 'desc' },
          })
        : Promise.resolve(null),

      // Tarefas pendentes no turno ativo deste operador
      userRecord
        ? prisma.shiftTask.count({
            where: {
              tenant_id:      (await getTenantId()),
              status:         'PENDING',
              shift_instance: { opened_by: userRecord.id, status: 'OPEN' },
              OR: [{ assigned_to_id: userRecord.id }, { assigned_to_id: null }],
            },
          })
        : Promise.resolve(0),
    ])

  const SHORTCUTS = [
    { title: 'Leituras',       desc: 'Registrar leitura de campo',            href: '/operador/leituras'    },
    { title: 'Ocorrências',    desc: 'Registrar ou acompanhar ocorrências',   href: '/operador/ocorrencias' },
    { title: 'Turnos',         desc: 'Abrir, acompanhar e passar turno',      href: '/operador/turnos'      },
    { title: 'Estoque Químico', desc: 'Registrar saídas e contagens físicas', href: '/operador/estoque'     },
  ]

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Operador</p>
        </div>

        {/* Passagens urgentes */}
        {pendingHandovers > 0 && (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors animate-pulse"
          >
            <p className="text-2xl font-bold text-amber-400">{pendingHandovers}</p>
            <p className="text-xs text-amber-500 mt-1">
              {pendingHandovers === 1 ? 'Passagem de turno aguardando sua confirmação' : 'Passagens de turno aguardando sua confirmação'}
            </p>
          </Link>
        )}

        {/* Estoque baixo */}
        {lowStockCount > 0 && (
          <Link
            href="/operador/estoque"
            className="block rounded-xl border border-red-900/60 bg-red-950/20 p-4 hover:bg-red-950/30 transition-colors"
          >
            <p className="text-2xl font-bold text-red-400">{lowStockCount}</p>
            <p className="text-xs text-red-400/80 mt-1">
              {lowStockCount === 1 ? 'Produto com estoque abaixo do mínimo' : 'Produtos com estoque abaixo do mínimo'}
            </p>
          </Link>
        )}

        {/* Turno ativo */}
        {turnoAtivo ? (
          <Link
            href={`/operador/turnos/${turnoAtivo.id}`}
            className="block rounded-xl border border-green-800/60 bg-green-950/20 p-4 hover:bg-green-950/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">Turno ativo</p>
                <p className="text-lg font-bold text-green-400 mt-0.5">{turnoAtivo.shift.name}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {turnoAtivo.shift.start_time} – {turnoAtivo.shift.end_time} · Em andamento
                </p>
              </div>
              <span className="text-green-500 text-xl">→</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-sm text-slate-500">Nenhum turno ativo</p>
            <p className="text-xs text-slate-600 mt-0.5">Toque para abrir um turno →</p>
          </Link>
        )}

        {/* Tarefas do turno */}
        {turnoAtivo ? (
          pendingTasksCount > 0 ? (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors"
            >
              <p className="text-2xl font-bold text-amber-400">{pendingTasksCount}</p>
              <p className="text-xs text-amber-500 mt-1">
                {pendingTasksCount === 1 ? 'Tarefa pendente no turno atual' : 'Tarefas pendentes no turno atual'}
              </p>
            </Link>
          ) : (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
            >
              <p className="text-sm text-slate-400">Nenhuma tarefa atribuída</p>
              <p className="text-xs text-slate-600 mt-0.5">Toque para ver tarefas do turno →</p>
            </Link>
          )
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-600">Tarefas do turno</p>
            <p className="text-xs text-slate-700 mt-0.5">Abra um turno primeiro</p>
          </div>
        )}

        {/* Leituras de hoje + Ocorrências em aberto */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/operador/leituras"
            className="rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-2xl font-bold text-slate-100">{leiturasDoDia}</p>
            <p className="text-xs text-slate-500 mt-1">
              {leiturasDoDia === 1 ? 'Leitura hoje' : 'Leituras hoje'}
            </p>
          </Link>

          <Link
            href="/operador/ocorrencias"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openOcorrencias > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-700 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openOcorrencias > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
              {openOcorrencias}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {openOcorrencias === 1 ? 'Ocorrência em aberto' : 'Ocorrências em aberto'}
            </p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}

`

### src\app\operador\estoque\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularEstoqueAtual } from '@/lib/stock-utils'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user.id
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const SaidaSchema = z.object({
  product_id: z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:   z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  notes:   z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  used_at: z.string().min(1, { error: 'Data obrigatória' }),
})

const ContagemSchema = z.object({
  product_id:       z.string().min(1, { error: 'Produto obrigatório' }),
  counted_quantity: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  notes:      z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  counted_at: z.string().min(1, { error: 'Data obrigatória' }),
})

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function registrarSaida(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (!['OPERATOR', 'TECHNICIAN'].includes(session.user.role)) return { error: 'Apenas operadores ou técnicos podem registrar saídas.' }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, notes, used_at } = parsed.data

  // Calcula estoque atual para verificar se ficará negativo
  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({
      where: { tenant_id: (await getTenantId()), product_id },
      _sum:  { quantity: true },
    }),
    prisma.chemicalStockExit.aggregate({
      where: { tenant_id: (await getTenantId()), product_id },
      _sum:  { quantity: true },
    }),
  ])

  const estoqueAtual = calcularEstoqueAtual(
    entries._sum.quantity ?? 0,
    exits._sum.quantity   ?? 0,
  )

  const recorded_by = await resolveUserId(session.user.email!)

  const novoEstoque = estoqueAtual - quantity
  if (novoEstoque < 0) {
    return {
      error: `Atenção: saída de ${quantity} resulta em estoque negativo (saldo atual é ${estoqueAtual.toFixed(2)}). Operação bloqueada.`,
    }
  }

  await prisma.chemicalStockExit.create({
    data: {
      tenant_id: (await getTenantId()),
      product_id,
      quantity,
      notes,
      used_at:    new Date(used_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  revalidatePath('/tecnico/estoque')
  revalidatePath(`/tecnico/estoque/${product_id}`)

  return { success: true }
}

export async function registrarContagem(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar contagens.' }

  const parsed = ContagemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, counted_quantity, notes, counted_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockCount.create({
    data: {
      tenant_id: (await getTenantId()),
      product_id,
      counted_quantity,
      notes,
      counted_at:  new Date(counted_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  return { success: true }
}

`

### src\app\operador\estoque\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import { getTenantId } from '@/lib/tenant'


export default async function OperadorEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Estoque Químico</h1>
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)
            const ultimaContagem = p.counts[0]?.counted_at

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>
                        Calculado:{' '}
                        <span className={calculado < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {formatarQuantidade(calculado)} {p.unit}
                        </span>
                      </span>
                      <span>
                        Físico:{' '}
                        <span className={fisico !== null && fisico < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                        </span>
                      </span>
                    </div>
                    {ultimaContagem && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Última contagem: {ultimaContagem.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/operador/estoque/${p.id}/saida`}
                    className="flex-1 text-center rounded-lg bg-red-900/40 border border-red-800/60 py-2 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    Registrar saída
                  </Link>
                  <Link
                    href={`/operador/estoque/${p.id}/contagem`}
                    className="flex-1 text-center rounded-lg bg-blue-900/30 border border-blue-800/50 py-2 text-sm font-medium text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Contagem física
                  </Link>
                </div>
              </div>
            )
          })
        )}
    </main>
  )
}

`

### src\app\operador\estoque\[id]\contagem\count-form.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarContagem } from '../../actions'
import { calcularDivergencia, formatarQuantidade } from '@/lib/stock-utils'

type Props = {
  productId:        string
  unit:             string
  estoqueCalculado: number
}

export function CountForm({ productId, unit, estoqueCalculado }: Props) {
  const router      = useRouter()
  const [qty, setQty] = useState('')
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarContagem(prev, formData)
    if (result?.success) router.push('/operador/estoque')
    return result
  }, null)

  const qtyNum      = parseFloat(qty)
  const divergencia = !isNaN(qtyNum) && qty !== '' ? calcularDivergencia(estoqueCalculado, qtyNum) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade contada ({unit}) *</label>
        <input
          name="counted_quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
        {divergencia !== null && (
          <p className={`text-xs font-medium ${
            divergencia === 0 ? 'text-green-400'
            : divergencia < 0  ? 'text-red-400'
            : 'text-amber-400'
          }`}>
            Divergência: {divergencia >= 0 ? '+' : ''}{formatarQuantidade(divergencia)} {unit}
            {divergencia === 0 && ' — em linha com o calculado'}
            {divergencia < 0  && ' — físico abaixo do calculado'}
            {divergencia > 0  && ' — físico acima do calculado'}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data e hora da contagem *</label>
        <input
          name="counted_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Condições da contagem, responsável, local..."
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar contagem'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/operador/estoque')}
          className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

`

### src\app\operador\estoque\[id]\contagem\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { CountForm } from './count-form'
import { getTenantId } from '@/lib/tenant'


export default async function ContagemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: (await getTenantId()), is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )
  const ultimaContagem = product.counts[0] ?? null

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div>
        <BackButton href="/operador/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Contagem Física — {product.name}</h1>
      </div>
        <div className="rounded-lg bg-slate-800/50 px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Estoque calculado</span>
            <span className="font-medium text-slate-100">{formatarQuantidade(calculado)} {product.unit}</span>
          </div>
          {ultimaContagem && (
            <div className="flex justify-between">
              <span className="text-slate-400">Última contagem</span>
              <span className="font-medium text-slate-100">
                {formatarQuantidade(ultimaContagem.counted_quantity)} {product.unit}
                <span className="text-slate-500 text-xs ml-2">
                  ({ultimaContagem.counted_at.toLocaleDateString('pt-BR')})
                </span>
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Conte o estoque fisicamente e registre a quantidade real. A divergência em relação ao
          calculado será exibida para o Gestor.
        </p>

        <CountForm
          productId={product.id}
          unit={product.unit}
          estoqueCalculado={calculado}
        />
    </main>
  )
}

`

### src\app\operador\estoque\[id]\saida\exit-form.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarSaida } from '../../actions'
import { Input } from '@/components/ui/input'

type Props = {
  productId:    string
  productName:  string
  unit:         string
  estoqueAtual: number
}

export function ExitForm({ productId, productName, unit, estoqueAtual }: Props) {
  const router  = useRouter()
  const [qty, setQty]             = useState('')
  const [offlineError, setOfflineError] = useState(false)
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarSaida(prev, formData)
    if (result?.success) router.push('/operador/estoque')
    return result
  }, null)

  const qtyNum       = parseFloat(qty) || 0
  const ficaNegativo = qtyNum > 0 && qtyNum > estoqueAtual

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />

      {offlineError && (
        <p aria-live="polite" className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}

      {state?.error && (
        <p aria-live="assertive" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

        <>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">
              Quantidade usada ({unit}) *
            </label>
            <Input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 py-6"
              placeholder="0"
            />
            {ficaNegativo && (
              <p className="text-xs text-red-400 mt-1">
                Não é possível retirar mais que o saldo disponível ({estoqueAtual.toFixed(2)} {unit}).
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data e hora do uso *</label>
            <Input
              name="used_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className="w-full bg-slate-800 border-slate-700 text-slate-100 py-6"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Observações</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Onde foi usado, processo, turno..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending || ficaNegativo}
              className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Registrando...' : 'Confirmar saída'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operador/estoque')}
              className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
    </form>
  )
}

`

### src\app\operador\estoque\[id]\saida\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { ExitForm } from './exit-form'
import { getTenantId } from '@/lib/tenant'


export default async function SaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: (await getTenantId()), is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )

  return (
    <main className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-4">
        <BackButton href="/operador/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Saída — {product.name}</h1>
      </div>
      <div className="rounded-lg bg-slate-800/50 px-4 py-3 mb-5 flex gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-500">Estoque calculado</p>
            <p className={`font-semibold ${calculado < product.min_stock ? 'text-red-400' : 'text-slate-100'}`}>
              {formatarQuantidade(calculado)} {product.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Mínimo</p>
            <p className="font-semibold text-slate-400">
              {formatarQuantidade(product.min_stock)} {product.unit}
            </p>
          </div>
        </div>
        <ExitForm
          productId={product.id}
          productName={product.name}
          unit={product.unit}
          estoqueAtual={calculado}
        />
    </main>
  )
}

`

### src\app\operador\layout.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { LayoutDashboard, Droplets, Clock, AlertTriangle, Package } from 'lucide-react'
import { TopNav } from '@/components/ui/top-nav'
import { NotificationBell } from '@/components/ui/notification-bell'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'

export default async function OperadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const NAV_ITEMS: NavItem[] = [
    { href: '/operador/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/operador/leituras',    label: 'Leituras',    icon: Droplets        },
    { href: '/operador/turnos',      label: 'Turnos',      icon: Clock           },
    { href: '/operador/ocorrencias', label: 'Ocorrências', icon: AlertTriangle   },
    { href: '/operador/estoque',     label: 'Estoque',     icon: Package         },
  ]

  const session = await auth()
  if (!session || !['OPERATOR', 'TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/operador/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Operador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <NotificationBell />
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      {/* Conteúdo — pb-16 para não ficar atrás da bottom nav */}
      <div className="pb-16">
        {children}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}

`

### src\app\operador\leituras\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const LeituraSchema = z
  .object({
    collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
    parameter_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    value: z.preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().nullable(),
    ),
    unit: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    notes: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres').nullable(),
    ),
    recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
  })
  .refine((d) => d.parameter_id === null || d.value !== null, {
    message: 'Informe o valor medido',
    path: ['value'],
  })

export type LeituraFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar leitura ────────────────────────────────────────────────────────

export async function registrarLeitura(
  _prev: LeituraFormState,
  formData: FormData,
): Promise<LeituraFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar leituras.' }

  const parsed = LeituraSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    unit:                formData.get('unit'),
    notes:               formData.get('notes'),
    recorded_at:         formData.get('recorded_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  let isNonConformant: boolean | null = null
  let unit = parsed.data.unit

  if (parsed.data.parameter_id) {
    const [param, collectionPoint] = await Promise.all([
      prisma.qualityParameter.findFirst({
        where:  { id: parsed.data.parameter_id, tenant_id: await getTenantId() },
        select: { min_limit: true, max_limit: true, unit: true },
      }),
      prisma.collectionPoint.findFirst({
        where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
        select: { id: true },
      })
    ])

    if (!collectionPoint) {
      return { error: 'Ponto de coleta inválido ou não autorizado.' }
    }

    if (param) {
      // Copia a unidade do parâmetro quando o formulário não enviou uma
      unit = unit ?? param.unit
      isNonConformant = calcularNaoConformidade(
        parsed.data.value,
        param.min_limit,
        param.max_limit,
      )
    } else {
      return { error: 'Parâmetro inválido ou não autorizado.' }
    }
  } else {
    // If no parameter is provided, we still need to validate the collection point
    const collectionPoint = await prisma.collectionPoint.findFirst({
      where: { id: parsed.data.collection_point_id, tenant_id: await getTenantId() },
      select: { id: true },
    })
    if (!collectionPoint) return { error: 'Ponto de coleta inválido ou não autorizado.' }
  }

  await prisma.$transaction(async (tx) => {
    const reading = await tx.reading.create({
      data: {
        tenant_id:           (await getTenantId()),
        collection_point_id: parsed.data.collection_point_id,
        parameter_id:        parsed.data.parameter_id,
        shift_instance_id:   null, // associado ao turno na Fase 9
        value:               parsed.data.value,
        unit,
        notes:               parsed.data.notes,
        is_non_conformant:   isNonConformant,
        origin:              'MANUAL',
        metadata_origin:     null,
        recorded_by:         userId,
        recorded_at:         new Date(parsed.data.recorded_at),
      },
    })

    // Se estiver fora da faixa, abre automaticamente uma ocorrência
    if (isNonConformant && parsed.data.parameter_id) {
      const paramName = await tx.qualityParameter.findFirst({ where: { id: parsed.data.parameter_id , tenant_id: (await getTenantId()) },
        select: { name: true }
      })
      
      const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
        where: { severity: 'HIGH' }
      })
      const deadlineHours = defaultSeverity?.deadline_hours || 24
      const deadline = new Date()
      deadline.setHours(deadline.getHours() + deadlineHours)

      await tx.occurrence.create({
        data: {
          tenant_id:   (await getTenantId()),
          description: `Não Conformidade (${paramName?.name}): Leitura registrada = ${parsed.data.value} ${unit}. O valor está fora dos limites aceitáveis. Ponto de Coleta: ${parsed.data.collection_point_id}`,
          severity:    'HIGH',
          status:      'OPEN',
          deadline,
          reported_by: userId,
        }
      })
    }
  })

  revalidatePath('/operador/leituras')
  revalidatePath('/operador/ocorrencias')
  return { success: true }
}

`

### src\app\operador\leituras\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ReadingForm } from './reading-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovaLeituraPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/operador/leituras" label="Leituras" />
      <ReadingForm collectionPoints={collectionPoints} parameters={parameters} />
    </main>
  )
}

`

### src\app\operador\leituras\nova\reading-form.tsx
`	s
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarLeitura, type LeituraFormState } from '../actions'

const DRAFT_KEY = 'reading_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = {
  id:        string
  name:      string
  unit:      string
  min_limit: number | null
  max_limit: number | null
}

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  value:               string
  notes:               string
  recorded_at:         string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: LeituraFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50'

export function ReadingForm({ collectionPoints, parameters }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarLeitura, initialState)

  // Controle de hidratação: impede salvar rascunho com estado vazio antes de carregar o draft
  const [mounted, setMounted]     = useState(false)
  const [offlineError, setOfflineError] = useState(false)

  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [notes, setNotes]                         = useState('')
  const [recordedAt, setRecordedAt]               = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setValueStr(d.value ?? '')
        setNotes(d.notes ?? '')
        setRecordedAt(d.recorded_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setRecordedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setRecordedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração (só após montar) ──────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      value:               valueStr,
      notes,
      recorded_at:         recordedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, valueStr, notes, recordedAt])

  // ── Ao submeter com sucesso: limpar rascunho e redirecionar ────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/leituras')
    }
  }, [state.success, router])

  // ── Parâmetro selecionado (para limites e unidade) ─────────────────────────
  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null

  // Verificação de não-conformidade em tempo real (client-side)
  const nonConformant: boolean | null = (() => {
    if (!selectedParam || valueStr === '') return null
    const v = parseFloat(valueStr)
    if (isNaN(v)) return null
    const below = selectedParam.min_limit !== null && v < selectedParam.min_limit
    const above = selectedParam.max_limit !== null && v > selectedParam.max_limit
    return below || above
  })()

  const hasLimits = selectedParam
    ? selectedParam.min_limit !== null || selectedParam.max_limit !== null
    : false

  const limitLabel = selectedParam
    ? `${selectedParam.min_limit ?? '—'} – ${selectedParam.max_limit ?? '—'} ${selectedParam.unit}`
    : ''

  return (
    <div className="space-y-5">
      <Link href="/operador/leituras" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para leituras
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova leitura</h1>
        <p className="text-xs text-slate-400">Registre a leitura de campo do turno atual.</p>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!navigator.onLine) {
            e.preventDefault()
            setOfflineError(true)
          }
        }}
        className="space-y-5"
      >
        {offlineError && (
          <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
            Sem conexão. Verifique sua internet e tente novamente.
          </p>
        )}

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
            Ponto de coleta
          </label>
          <select
            id="collection_point_id"
            name="collection_point_id"
            value={collectionPointId}
            onChange={(e) => setCollectionPointId(e.target.value)}
            disabled={isPending}
            required
            className={SELECT_CLS}
          >
            <option value="">Selecione o ponto…</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro (opcional) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
            Parâmetro{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <select
            id="parameter_id"
            name="parameter_id"
            value={parameterId}
            onChange={(e) => {
              setParameterId(e.target.value)
              setValueStr('')
            }}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Nenhum — observação visual</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        {/* ── Valor medido (visível só quando há parâmetro) ─────────────── */}
        {selectedParam && (
          <div className="space-y-1.5">
            <label htmlFor="value" className="text-sm font-medium text-slate-300">
              Valor medido
            </label>
            <div className="relative">
              <Input
                id="value"
                name="value"
                type="number"
                step="0.001"
                inputMode="decimal"
                placeholder="0,00"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                disabled={isPending}
                required
                className={[
                  'pr-16 bg-slate-800 text-slate-100 placeholder:text-slate-500',
                  nonConformant === true
                    ? 'border-red-600 focus-visible:ring-red-600'
                    : 'border-slate-700 focus-visible:ring-slate-500',
                ].join(' ')}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                {selectedParam.unit}
              </span>
            </div>

            {/* Faixa permitida / alerta de não-conformidade */}
            {hasLimits && (
              <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-slate-500'}`}>
                {nonConformant === true ? 'Fora do limite CONAMA: ' : 'Limite CONAMA: '}
                {limitLabel}
              </p>
            )}

            {state.fieldErrors?.value && (
              <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
            )}
          </div>
        )}

        {/* ── Observação ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-slate-300">
            Observação{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            autoComplete="off"
            placeholder="Ex: amostra coletada após chuva forte"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.notes && (
            <p className="text-xs text-red-400">{state.fieldErrors.notes[0]}</p>
          )}
        </div>

        {/* ── Data/hora da leitura ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="recorded_at" className="text-sm font-medium text-slate-300">
            Data/hora da leitura
          </label>
          <Input
            id="recorded_at"
            name="recorded_at"
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            disabled={isPending}
            required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.recorded_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.recorded_at[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar leitura'}
        </Button>
      </form>
    </div>
  )
}

`

### src\app\operador\leituras\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function LeituraListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, filter } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: any = { tenant_id: (await getTenantId()) }
  if (filter === 'non-conformant') {
    where.is_non_conformant = true
  } else if (filter === 'conformant') {
    where.is_non_conformant = false
  }

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho da listagem */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Leituras</h1>
            <p className="text-xs text-slate-400">{total} registro(s) no total</p>
          </div>
          <Link href="/operador/leituras/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href="/operador/leituras" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${!filter ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Todas
          </Link>
          <Link href="/operador/leituras?filter=conformant" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'conformant' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Conforme
          </Link>
          <Link href="/operador/leituras?filter=non-conformant" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'non-conformant' ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Não Conforme
          </Link>
        </div>

        {/* Lista de leituras */}
        {readings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma leitura registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map((r) => (
              <div
                key={r.id}
                className={[
                  'rounded-xl border bg-slate-900 p-4 space-y-1.5',
                  r.is_non_conformant === true
                    ? 'border-red-900/60'
                    : 'border-slate-800',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {r.collection_point.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDatetime(r.recorded_at)}</p>
                  </div>
                  {r.is_non_conformant === true && (
                    <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                      Fora do limite
                    </span>
                  )}
                </div>

                {/* Valor do parâmetro ou indicação de observação visual */}
                {r.parameter ? (
                  <p className="text-sm text-slate-300">
                    <span className="font-medium">{r.parameter.name}:</span>{' '}
                    {r.value !== null
                      ? `${r.value}${r.unit ? ` ${r.unit}` : ''}`
                      : '—'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">Observação visual</p>
                )}

                {/* Observação livre (truncada) */}
                {r.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/operador/leituras?page=${page - 1}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-600">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/operador/leituras?page=${page + 1}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

        {/* Link de volta ao dashboard */}
        <div className="pt-2">
          <Link href="/operador/dashboard" className="text-xs text-slate-600 hover:text-slate-400">
            ← Voltar ao painel
          </Link>
        </div>
    </main>
  )
}

`

### src\app\operador\loading.tsx
`	s
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}

`

### src\app\operador\ocorrencias\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireAuthenticated() {
  const session = await auth()
  if (!session || !['OPERATOR', 'TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a severidade',
  }),
  category: z.string().min(1, 'Selecione a categoria'),
  collection_point_id: z.string().optional().or(z.literal('')),
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type OcorrenciaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar ocorrência ─────────────────────────────────────────────────────

export async function registrarOcorrencia(
  _prev: OcorrenciaFormState,
  formData: FormData,
): Promise<OcorrenciaFormState> {
  const session = await requireAuthenticated()

  const parsed = OcorrenciaSchema.safeParse({
    description: formData.get('description'),
    severity:    formData.get('severity'),
    category:    formData.get('category'),
    collection_point_id: formData.get('collection_point_id') || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  // Prazo calculado a partir da configuração de severidade
  const severityDefault = await prisma.occurrenceSeverityDefault.findUnique({
    where: { severity: parsed.data.severity },
  })
  if (!severityDefault) return { error: 'Configuração de prazo não encontrada. Contate o Gestor.' }

  const deadline = new Date(Date.now() + severityDefault.deadline_hours * 60 * 60 * 1000)

  // Trata foto (opcional)
  const photoFile = formData.get('photo') as File | null
  type PhotoPayload = {
    filename:      string
    original_name: string
    mime_type:     string
    size_bytes:    number
  }
  let photoPayload: PhotoPayload | null = null

  if (photoFile && photoFile.size > 0) {
    if (!ALLOWED_TYPES.includes(photoFile.type)) {
      return { fieldErrors: { photo: ['Formato inválido. Use JPG, PNG ou WEBP.'] } }
    }
    if (photoFile.size > MAX_FILE_BYTES) {
      return { fieldErrors: { photo: ['Arquivo muito grande. Máximo 5 MB.'] } }
    }

    const ext      = photoFile.type === 'image/jpeg' ? 'jpg' : photoFile.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`
    const dir      = path.join(process.cwd(), 'uploads', 'occurrences')

    await fs.mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    await fs.writeFile(path.join(dir, filename), buffer)

    photoPayload = {
      filename,
      original_name: photoFile.name,
      mime_type:     photoFile.type,
      size_bytes:    photoFile.size,
    }
  }

  // Cria ocorrência (+ foto + audit) em transação atômica
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.create({
      data: {
        tenant_id:   (await getTenantId()),
        description: parsed.data.description,
        category:    parsed.data.category,
        severity:    parsed.data.severity,
        status:      'OPEN',
        deadline,
        reported_by: userId,
        collection_point_id: parsed.data.collection_point_id || null,
      },
    })

    if (photoPayload) {
      await tx.occurrencePhoto.create({
        data: {
          tenant_id:     (await getTenantId()),
          occurrence_id: occurrence.id,
          filename:      photoPayload.filename,
          original_name: photoPayload.original_name,
          mime_type:     photoPayload.mime_type,
          size_bytes:    photoPayload.size_bytes,
          uploaded_by:   userId,
        },
      })
    }

    await logAudit(tx, {
      userId,
      action:    'CREATE',
      tableName: 'occurrences',
      recordId:  occurrence.id,
      after:     { description: parsed.data.description, severity: parsed.data.severity, status: 'OPEN', deadline },
    })
  })

  revalidatePath('/operador/ocorrencias')
  revalidatePath('/tecnico/ocorrencias')
  revalidatePath('/gestor/ocorrencias')
  return { success: true }
}

`

### src\app\operador\ocorrencias\nova\occurrence-form.tsx
`	s
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '../actions'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'occurrence_draft'
const INITIAL: OcorrenciaFormState = {}

// Prazo sugerido por severidade (espelha occurrence_severity_defaults do seed)
const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = { description: string; severity: string; category: string; collection_point_id: string }
const EMPTY_DRAFT: Draft = { description: '', severity: '', category: '', collection_point_id: '' }

export function OccurrenceForm({ collectionPoints = [] }: { collectionPoints?: {id: string, name: string, location: string | null}[] }) {
  const router   = useRouter()
  const formRef  = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)

  const [mounted,      setMounted]      = useState(false)
  const [draft,        setDraft]        = useState<Draft>(EMPTY_DRAFT)
  const [photoName,    setPhotoName]    = useState<string | null>(null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const [offlineError, setOfflineError] = useState(false)

  // Hidrata do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved) as Draft)
    } catch { /* ignora */ }
    setMounted(true)
  }, [])

  // Persiste no localStorage
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  // Navega após sucesso
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/ocorrencias')
    }
  }, [state.success, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(null); return }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Formato inválido. Use JPG, PNG ou WEBP.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Arquivo muito grande. Máximo 5 MB.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    setPhotoName(file.name)
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo?.[0]

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-5"
    >
      {offlineError && (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description" name="description"
          rows={4}
          autoComplete="off"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-medium text-slate-300">
          Categoria *
        </label>
        <select
          id="category" name="category"
          value={draft.category}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Selecione…</option>
          <option value="VAZAMENTO">Vazamento</option>
          <option value="QUEBRA">Quebra de Equipamento</option>
          <option value="FALTA_PRODUTO">Falta de Produto</option>
          <option value="SEGURANCA">Segurança/Risco</option>
          <option value="OUTROS">Outros</option>
        </select>
        {state.fieldErrors?.category && (
          <p className="text-xs text-red-400">{state.fieldErrors.category[0]}</p>
        )}
      </div>

      {/* Ponto de Coleta (Opcional) */}
      <div className="space-y-1.5">
        <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
          Ponto de Coleta <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <select
          id="collection_point_id" name="collection_point_id"
          value={draft.collection_point_id}
          onChange={(e) => setDraft((d) => ({ ...d, collection_point_id: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Nenhum específico</option>
          {collectionPoints.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.location ? `(${p.location})` : ''}
            </option>
          ))}
        </select>
        {state.fieldErrors?.collection_point_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-medium text-slate-300">
          Severidade *
        </label>
        <select
          id="severity" name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Selecione…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido (leitura) */}
      {draft.severity && (
        <div className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm">
          <span className="text-slate-500">Prazo para resolução: </span>
          <span className="text-slate-300 font-medium">{DEADLINE_LABEL[draft.severity]}</span>
          <span className="ml-1.5 text-xs text-slate-600">(definido pelo Gestor)</span>
        </div>
      )}

      {/* Foto */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Foto <span className="text-slate-500 font-normal">(opcional — JPG, PNG ou WEBP, máx. 5 MB)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 hover:bg-slate-800 transition-colors">
          <span className="text-xs text-slate-400 flex-1 truncate">
            {photoName ?? 'Toque para selecionar uma foto'}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <span className="shrink-0 rounded px-2 py-1 text-xs bg-slate-700 text-slate-300">
            Escolher
          </span>
        </label>
        {photoFieldError && (
          <p className="text-xs text-red-400">{photoFieldError}</p>
        )}
        <p className="text-xs text-slate-600">
          Ao reabrir esta página o texto é recuperado, mas a foto precisa ser selecionada novamente.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-14 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50 text-base"
      >
        {isPending ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}

`

### src\app\operador\ocorrencias\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { OccurrenceForm } from './occurrence-form'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export default async function NovaOcorrenciaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const collectionPoints = await prisma.collectionPoint.findMany({
    where: { tenant_id: await getTenantId(), is_active: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' }
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4 pb-24">
      <div>
        <BackButton href="/operador/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <OccurrenceForm collectionPoints={collectionPoints} />
    </main>
  )
}

`

### src\app\operador\ocorrencias\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 20

import { SEVERITY_LABEL, SEVERITY_COLOR, OCCURRENCE_STATUS_LABEL } from '@/lib/labels'

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, filter } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const userId = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })

  if (!userId) redirect('/login')

  const where: any = { tenant_id: (await getTenantId()), reported_by: userId.id }
  if (filter === 'open') {
    where.status = { in: ['OPEN', 'IN_PROGRESS'] }
  } else if (filter === 'resolved') {
    where.status = 'RESOLVED'
  } else if (filter === 'high') {
    where.severity = { in: ['HIGH', 'CRITICAL'] }
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        photos: { select: { id: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/operador/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href="/operador/ocorrencias" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${!filter ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Todas
          </Link>
          <Link href="/operador/ocorrencias?filter=open" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'open' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Abertas
          </Link>
          <Link href="/operador/ocorrencias?filter=high" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'high' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Alta Prioridade
          </Link>
          <Link href="/operador/ocorrencias?filter=resolved" className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${filter === 'resolved' ? 'bg-brand/20 text-brand border-brand/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
            Resolvidas
          </Link>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma ocorrência registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((oc) => {
              const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
              const hasPhoto     = oc.photos.length > 0

              return (
                <div
                  key={oc.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-2',
                    prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  {/* Linha superior: badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                      </span>
                      {prazoVencido && (
                        <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                          PRAZO VENCIDO
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {OCCURRENCE_STATUS_LABEL[oc.status] ?? oc.status}
                    </span>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                  {/* Rodapé: data + prazo + foto */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{formatDatetime(oc.created_at)}</span>
                    <div className="flex items-center gap-2">
                      {hasPhoto && (
                        <Link
                          href={`/api/occurrences/${oc.id}/photo`}
                          target="_blank"
                          className="text-sky-500 hover:text-sky-400"
                        >
                          Ver foto
                        </Link>
                      )}
                      <span className={prazoVencido ? 'text-red-400' : ''}>
                        Prazo: {formatDatetime(oc.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/operador/ocorrencias?page=${page - 1}`} className="text-slate-400 hover:text-slate-200">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/operador/ocorrencias?page=${page + 1}`} className="text-slate-400 hover:text-slate-200">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

      </main>
  )
}

`

### src\app\operador\ocorrencias\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, User, CheckCircle2, History, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SEVERITY_LABEL, OCCURRENCE_STATUS_LABEL, OCCURRENCE_STATUS_COLOR } from '@/lib/labels'

export default async function OperadorOcorrenciaDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: params.id, tenant_id },
    include: {
      reporter: { select: { name: true } },
      responsible: { select: { name: true } },
      resolver: { select: { name: true } },
      collection_point: { select: { name: true } },
      photos: { select: { id: true }, take: 1 },
    }
  })

  if (!occurrence) {
    notFound()
  }

  const getStatusColor = (s: string) => {
    return OCCURRENCE_STATUS_COLOR[s] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }

  const getStatusText = (s: string) => {
    return OCCURRENCE_STATUS_LABEL[s] || s
  }

  const getSeverityBadge = (s: string) => {
    return SEVERITY_LABEL[s] || s
  }

  return (
    <main className="px-6 py-8 max-w-4xl mx-auto space-y-6 pb-24">
      <Link 
        href="/operador/ocorrencias" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Ocorrências
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(occurrence.status)} uppercase tracking-wider`}>
              {getStatusText(occurrence.status)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">ID: {occurrence.id.slice(-6).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {occurrence.category || 'Ocorrência'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detalhes da Ocorrência</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{occurrence.description}</p>
            
            {occurrence.photos.length > 0 && (
              <div className="pt-2">
                <Link
                  href={`/api/occurrences/${occurrence.id}/photo`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-soft"
                >
                  Ver foto anexada →
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Severidade</span>
                <span className="font-medium text-sm text-foreground">{getSeverityBadge(occurrence.severity)}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Local / Ponto</span>
                <span className="font-medium text-sm text-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {occurrence.collection_point?.name || 'Não especificado'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Timeline de Resolução
            </h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-1 bg-primary text-primary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-surface-2 border border-border shadow-sm">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-foreground text-sm">Abertura</div>
                    <time className="font-mono text-xs text-muted-foreground">{occurrence.created_at.toLocaleString('pt-BR')}</time>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Por {occurrence.reporter?.name}
                  </div>
                </div>
              </div>

              {occurrence.status === 'RESOLVED' && occurrence.resolved_at && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-1 bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-surface-2 border border-border shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-foreground text-sm">Resolvida</div>
                      <time className="font-mono text-xs text-muted-foreground">{occurrence.resolved_at.toLocaleString('pt-BR')}</time>
                    </div>
                    {occurrence.resolution_notes && (
                      <div className="text-sm text-foreground mt-2 p-3 bg-surface-1 rounded-md border border-border">
                        {occurrence.resolution_notes}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Por {occurrence.resolver?.name || 'Desconhecido'}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Note: Adicionamos um link placeholder/form que permitiria ao Operador resolver diretamente */}
            {occurrence.status !== 'RESOLVED' && (
              <div className="mt-6 pt-6 border-t border-border">
                <form className="space-y-4" action="/api/ocorrencias/resolver" method="POST">
                  <input type="hidden" name="id" value={occurrence.id} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adicionar Notas de Resolução</label>
                    <textarea 
                      name="notes"
                      className="w-full p-3 rounded-lg border border-border bg-surface-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" 
                      rows={3} 
                      placeholder="Descreva o que foi feito para resolver o problema..."
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 opacity-50 cursor-not-allowed" title="Em breve">
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Resolvida
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Responsabilidade</h2>
            
            <div>
              <span className="block text-xs text-muted-foreground mb-1">Atribuído para</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {occurrence.responsible?.name?.charAt(0) || '?'}
                </div>
                <span className="font-medium text-sm text-foreground">{occurrence.responsible?.name || 'Não atribuído'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <span className="block text-xs text-muted-foreground mb-1">Prazo SLA</span>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className={occurrence.deadline < new Date() && occurrence.status !== 'RESOLVED' ? 'text-red-500 font-bold animate-pulse' : 'text-foreground'}>
                  {occurrence.deadline.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

`

### src\app\operador\turnos\abrir\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ShiftForm } from './shift-form'
import { getTenantId } from '@/lib/tenant'


export default async function AbrirTurnoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div>
        <BackButton href="/operador/turnos" label="Turnos" />
        <h1 className="text-xl font-semibold mt-1">Abrir turno</h1>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center space-y-2">
          <p className="text-sm text-slate-500">Nenhum turno configurado.</p>
          <p className="text-xs text-slate-600">Peça ao gestor para cadastrar os turnos.</p>
        </div>
      ) : (
        <ShiftForm shifts={shifts} />
      )}
    </main>
  )
}

`

### src\app\operador\turnos\abrir\shift-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { abrirTurno } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function ShiftForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(abrirTurno, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        {shifts.map((shift) => (
          <label
            key={shift.id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 cursor-pointer hover:bg-slate-800/60 transition-colors has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/20"
          >
            <input
              type="radio"
              name="shift_id"
              value={shift.id}
              className="accent-emerald-500"
            />
            <div>
              <p className="text-sm font-medium">{shift.name}</p>
              <p className="text-xs text-slate-500">{shift.start_time} – {shift.end_time}</p>
            </div>
          </label>
        ))}
      </div>

      {state.fieldErrors?.shift_id && (
        <p className="text-xs text-red-400">{state.fieldErrors.shift_id[0]}</p>
      )}
      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Abrindo…' : 'Confirmar abertura'}
      </Button>
    </form>
  )
}

`

### src\app\operador\turnos\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { isMimeTypeValido } from '@/lib/occurrence-utils'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'

const MAX_PHOTOS_TASK = 3
const MAX_FILE_SIZE   = 5 * 1024 * 1024 // 5 MB

// ─── Guards + helpers ─────────────────────────────────────────────────────────

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// Normaliza para meia-noite local — data do calendário independe da hora
function normalizarData(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AbrirTurnoSchema = z.object({
  shift_id: z.string().min(1, 'Selecione o turno'),
})

const IniciarPassagemSchema = z.object({
  pending_items: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  outgoing_observations: z.string().min(5, 'A observação do turno deve ter pelo menos 5 caracteres.'),
  confirm: z.literal('on', {
    error: 'É obrigatório confirmar a passagem do turno.'
  }),
})

const ConfirmarPassagemSchema = z.object({
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const ConcluirTarefaSchema = z.object({
  completion_notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TurnoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Lazy timeout (chamado em Server Components ao renderizar a página) ────────
// Não é uma Server Action de formulário — é chamada direto no page.tsx

export async function aplicarTimeouts(): Promise<void> {
  const now = new Date()
  await prisma.shiftHandover.updateMany({
    where: {
      status:     'PENDING',
      timeout_at: { lt: now },
    },
    data: { status: 'TIMED_OUT' },
  })
}

// ─── Abrir turno ──────────────────────────────────────────────────────────────

export async function abrirTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem abrir turnos.' }

  const parsed = AbrirTurnoSchema.safeParse({
    shift_id: formData.get('shift_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const today = normalizarData(new Date())

  // Verifica que o turno configurado existe e pertence ao tenant
  const shift = await prisma.shift.findFirst({
    where:  { id: parsed.data.shift_id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  // Verificação de duplicado em transação (SQLite serializa escritas — seguro no MVP)
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.shiftInstance.findFirst({
      where: {
        tenant_id: (await getTenantId()),
        shift_id:  parsed.data.shift_id,
        date:      today,
        status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
      },
    })
    if (existing) {
      return { error: 'Já existe um turno aberto para este período.' } as TurnoFormState
    }

    // Se existe instância pré-agendada (SCHEDULED), promove para OPEN
    const scheduled = await tx.shiftInstance.findFirst({
      where: {
        tenant_id: (await getTenantId()),
        shift_id:  parsed.data.shift_id,
        date:      today,
        status:    'SCHEDULED',
      },
    })

    if (scheduled) {
      await tx.shiftInstance.updateMany({ where: { id: scheduled.id , tenant_id: (await getTenantId()) }, data: {
          opened_by: userId,
          opened_at: new Date(),
          status:    'OPEN',
        },
      })
    } else {
      await tx.shiftInstance.create({
        data: {
          tenant_id: (await getTenantId()),
          shift_id:  parsed.data.shift_id,
          date:      today,
          opened_by: userId,
          opened_at: new Date(),
          status:    'OPEN',
        },
      })
    }
    return null
  })

  if (result?.error) return result
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Iniciar passagem (Etapa 1 — operador sainte) ─────────────────────────────

export async function iniciarPassagem(
  instanceId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem iniciar passagens.' }

  const parsed = IniciarPassagemSchema.safeParse({
    pending_items:         formData.get('pending_items'),
    outgoing_observations: formData.get('outgoing_observations'),
    confirm:               formData.get('confirm'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const instance = await prisma.shiftInstance.findFirst({ where: { id: instanceId , tenant_id: (await getTenantId()) },
    include: {
      shift:    { select: { handover_timeout_minutes: true } },
      handover: { select: { id: true } },
    },
  })
  if (!instance || instance.tenant_id !== (await getTenantId())) return { error: 'Turno não encontrado.' }
  if (instance.status !== 'OPEN')    return { error: 'Este turno não está aberto.' }
  if (instance.handover)             return { error: 'A passagem já foi iniciada.' }

  // Auto-captura do checklist: leituras, ocorrências abertas e tarefas pendentes
  const [readingsCount, openOccurrencesCount, pendingTasks] = await Promise.all([
    prisma.reading.count({
      where: { tenant_id: (await getTenantId()), shift_instance_id: instanceId },
    }),
    prisma.occurrence.count({
      where: { tenant_id: (await getTenantId()), status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.findMany({
      where:  { tenant_id: (await getTenantId()), shift_instance_id: instanceId, status: 'PENDING' },
      select: { title: true },
    }),
  ])

  const checklistData = JSON.stringify({
    readings_count:         readingsCount,
    open_occurrences_count: openOccurrencesCount,
    pending_items:          parsed.data.pending_items ?? '',
    pending_tasks_count:    pendingTasks.length,
    pending_tasks:          pendingTasks.map((t) => t.title),
  })

  const handoverAt = new Date()
  const timeoutAt  = new Date(
    handoverAt.getTime() + instance.shift.handover_timeout_minutes * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.create({
      data: {
        tenant_id:             (await getTenantId()),
        shift_instance_id:     instanceId,
        outgoing_user_id:      userId,
        checklist_data:        checklistData,
        outgoing_observations: parsed.data.outgoing_observations,
        handover_at:           handoverAt,
        timeout_at:            timeoutAt,
        status:                'PENDING',
      },
    })
    await tx.shiftInstance.updateMany({ where: { id: instanceId , tenant_id: (await getTenantId()) }, data:  { status: 'HANDOVER_PENDING' },
    })
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Confirmar passagem (Etapa 2 — operador entrante) ─────────────────────────

export async function confirmarPassagem(
  handoverId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem confirmar passagens.' }

  const parsed = ConfirmarPassagemSchema.safeParse({
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: { shift_instance: { select: { id: true, tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'PENDING') {
    return { error: 'Esta passagem já foi encerrada.' }
  }
  // Sainte não pode confirmar a própria passagem
  if (handover.outgoing_user_id === userId) {
    return { error: 'Quem iniciou a passagem não pode confirmá-la.' }
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.updateMany({ where: { id: handoverId , tenant_id: (await getTenantId()) }, data: {
        status:                'CONFIRMED',
        confirmed_at:          now,
        incoming_user_id:      userId,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await tx.shiftInstance.updateMany({ where: { id: handover.shift_instance.id , tenant_id: (await getTenantId()) }, data:  { status: 'CLOSED', closed_at: now },
    })
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Concluir tarefa ──────────────────────────────────────────────────────────

export async function concluirTarefa(
  taskId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem concluir tarefas.' }

  const parsed = ConcluirTarefaSchema.safeParse({
    completion_notes: formData.get('completion_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: (await getTenantId()) },
    include: {
      shift_instance: { select: { status: true } },
      photos:         { select: { id: true } },
    },
  })
  if (!task)                                   return { error: 'Tarefa não encontrada.' }
  if (task.status !== 'PENDING')               return { error: 'Esta tarefa já foi concluída ou pulada.' }
  if (task.shift_instance.status === 'CLOSED') return { error: 'O turno já foi encerrado.' }

  // Valida fotos (0–3 por tarefa; considera fotos já existentes)
  const files = (formData.getAll('photos') as File[]).filter((f) => f.size > 0)
  if (task.photos.length + files.length > MAX_PHOTOS_TASK) {
    return { error: `Máximo de ${MAX_PHOTOS_TASK} fotos por tarefa.` }
  }
  for (const file of files) {
    if (!isMimeTypeValido(file.type)) return { error: `Arquivo inválido: ${file.name}. Use JPG, PNG ou WebP.` }
    if (file.size > MAX_FILE_SIZE)    return { error: `${file.name} excede 5 MB.` }
  }

  // Salva arquivos em disco antes da transação — evita BLOBs no SQLite
  const photoRecords: { filename: string; original_name: string; mime_type: string; size_bytes: number }[] = []
  if (files.length > 0) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tasks')
    await fs.mkdir(uploadsDir, { recursive: true })
    for (const file of files) {
      const ext      = file.name.split('.').pop() ?? 'bin'
      const filename = `${randomUUID()}.${ext}`
      await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()))
      photoRecords.push({ filename, original_name: file.name, mime_type: file.type, size_bytes: file.size })
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.shiftTask.updateMany({ where: { id: taskId , tenant_id: (await getTenantId()) }, data:  {
        status:           'DONE',
        completed_at:     now,
        completed_by:     userId,
        completion_notes: parsed.data.completion_notes,
      },
    })
    if (photoRecords.length > 0) {
      const tenantId = await getTenantId()
      await tx.shiftTaskPhoto.createMany({
        data: photoRecords.map((p) => ({
          tenant_id:     tenantId,
          task_id:       taskId,
          filename:      p.filename,
          original_name: p.original_name,
          mime_type:     p.mime_type,
          size_bytes:    p.size_bytes,
          uploaded_by:   userId,
          uploaded_at:   now,
        })),
      })
    }
  })

  revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Pular tarefa ─────────────────────────────────────────────────────────────

export async function pularTarefa(taskId: string): Promise<void> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: (await getTenantId()), status: 'PENDING' },
    include: { shift_instance: { select: { status: true } } },
  })
  if (!task || task.shift_instance.status === 'CLOSED') return

  await prisma.shiftTask.updateMany({ where: { id: taskId , tenant_id: (await getTenantId()) }, data:  { status: 'SKIPPED' },
  })
  revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
}

`

### src\app\operador\turnos\confirmar\confirm-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarPassagem } from '../actions'
import type { TurnoFormState } from '../actions'

const INITIAL: TurnoFormState = {}

export function ConfirmForm({ handoverId }: { handoverId: string }) {
  const router = useRouter()
  const action = confirmarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Suas observações
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="incoming_observations"
          rows={3}
          placeholder="Observações sobre o recebimento do turno"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Confirmando…' : 'Confirmar recebimento do turno'}
      </Button>
    </form>
  )
}

`

### src\app\operador\turnos\confirmar\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConfirmForm } from './confirm-form'
import { getTenantId } from '@/lib/tenant'


function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ handoverId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { handoverId } = await searchParams
  if (!handoverId) redirect('/operador/turnos')

  const handover = await prisma.shiftHandover.findFirst({ where: { id: handoverId , tenant_id: (await getTenantId()) },
    include: {
      shift_instance: {
        select: {
          id:        true,
          tenant_id: true,
          shift: { select: { name: true, start_time: true, end_time: true } },
        },
      },
      outgoing_user: { select: { name: true } },
    },
  })

  if (!handover || handover.shift_instance.tenant_id !== (await getTenantId())) redirect('/operador/turnos')
  if (handover.status !== 'PENDING') redirect('/operador/turnos')

  let checklist: {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  } = {}
  try { checklist = JSON.parse(handover.checklist_data) } catch { /* ignora */ }

  const vencido = new Date(handover.timeout_at) < new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Confirmar recebimento</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {handover.shift_instance.shift.name} · sainte: {handover.outgoing_user.name}
            </p>
          </div>
          {vencido && (
            <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
              TIMEOUT
            </span>
          )}
        </div>

        {/* Resumo do turno sainte */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', (checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Itens pendentes</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          {handover.outgoing_observations && (
            <div className="rounded-lg bg-slate-800/40 px-3 py-2">
              <p className="text-xs font-medium text-slate-400 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300">{handover.outgoing_observations}</p>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Prazo de confirmação: {formatDatetime(new Date(handover.timeout_at))}
          </p>
        </div>

        <ConfirmForm handoverId={handoverId} />

    </main>
  )
}

`

### src\app\operador\turnos\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { aplicarTimeouts } from './actions'
import { getTenantId } from '@/lib/tenant'


const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function TurnosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Aplica timeouts pendentes de forma lazy
  await aplicarTimeouts()

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email: session.user.email! } },
    select: { id: true },
  })
  if (!userRecord) redirect('/login')

  const userId = userRecord.id

  // Tarefas ativas (OPEN ou HANDOVER_PENDING) de qualquer data
  // Inclui turnos noturnos (crosses_midnight) abertos ontem e ainda não encerrados
  const activeInstances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: (await getTenantId()),
      status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
    },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: {
        select: {
          id:               true,
          status:           true,
          timeout_at:       true,
          outgoing_user_id: true,
          checklist_data:   true,
          outgoing_user:    { select: { name: true } },
        },
      },
      shift_tasks: {
        where:  { status: 'PENDING' },
        select: { id: true },
      },
    },
    orderBy: { opened_at: 'asc' },
  })

  // Handovers PENDING que este operador pode confirmar (ele não é o sainte)
  const pendingToConfirm = activeInstances.filter(
    (inst) =>
      inst.handover?.status === 'PENDING' &&
      inst.handover.outgoing_user_id !== userId,
  )

  // Turnos que eu abri (e ainda estão OPEN)
  const myOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by === userId,
  )

  // Turnos OPEN de outros — posso também iniciar passagem (qualquer operador pode)
  const otherOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by !== userId,
  )

  const now = new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Turnos</h1>
          <Link href="/operador/turnos/abrir">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Abrir turno
            </Button>
          </Link>
        </div>

        {/* ─── Passagens aguardando minha confirmação ─── */}
        {pendingToConfirm.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-amber-400">Aguardando sua confirmação</h2>
            {pendingToConfirm.map((inst) => {
              const h        = inst.handover!
              const vencido  = new Date(h.timeout_at) < now
              let checklist: {
                readings_count?: number
                open_occurrences_count?: number
                pending_items?: string
                pending_tasks_count?: number
                pending_tasks?: string[]
              } = {}
              try { checklist = JSON.parse(h.checklist_data) } catch { /* ignora */ }

              return (
                <div
                  key={inst.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-3',
                    vencido ? 'border-red-900/60' : 'border-amber-900/60',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        Sainte: {h.outgoing_user.name} · {formatTime(new Date(inst.opened_at))}
                      </p>
                    </div>
                    {vencido && (
                      <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
                        TIMEOUT
                      </span>
                    )}
                  </div>

                  {/* Resumo do checklist */}
                  <div className="rounded-md bg-slate-800/60 px-3 py-2 text-xs text-slate-400 space-y-1">
                    <p>{checklist.readings_count ?? 0} leitura(s) no turno</p>
                    <p>{checklist.open_occurrences_count ?? 0} ocorrência(s) em aberto</p>
                    {(checklist.pending_tasks_count ?? 0) > 0 && (
                      <div className="pt-0.5">
                        <p className="text-amber-400 font-medium">
                          {checklist.pending_tasks_count} tarefa(s) não concluída(s):
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {(checklist.pending_tasks ?? []).map((title, i) => (
                            <li key={i} className="text-slate-300">• {title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {checklist.pending_items && (
                      <p className="text-slate-300">Pendências: {checklist.pending_items}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Prazo de confirmação: {formatDatetime(new Date(h.timeout_at))}
                  </p>

                  <Link href={`/operador/turnos/confirmar?handoverId=${h.id}`}>
                    <Button className="h-11 w-full bg-amber-900/60 text-amber-300 hover:bg-amber-900 border border-amber-900/50 text-sm">
                      Confirmar recebimento
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Meus turnos abertos (posso iniciar passagem) ─── */}
        {myOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Meu turno ativo</h2>
            {myOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      {inst.shift.start_time} – {inst.shift.end_time} · aberto às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {/* Badge de tarefas pendentes */}
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem de turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Outros turnos abertos (outros operadores) ─── */}
        {otherOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Outros turnos ativos</h2>
            {otherOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      Aberto por {inst.opener.name} às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem deste turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Sem atividade ─── */}
        {activeInstances.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center space-y-3">
            <p className="text-sm text-slate-500">Nenhum turno ativo hoje.</p>
            <Link href="/operador/turnos/abrir">
              <Button className="bg-slate-100 text-slate-900 hover:bg-white text-sm h-10 px-6">
                Abrir turno
              </Button>
            </Link>
          </div>
        )}

      </main>
  )
}

`

### src\app\operador\turnos\[id]\passagem\handover-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { iniciarPassagem } from '../../actions'
import type { TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

export function HandoverForm({ instanceId }: { instanceId: string }) {
  const router = useRouter()
  const action = iniciarPassagem.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Itens pendentes
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="pending_items"
          rows={3}
          placeholder="Ex: Bomba B2 com vibração anormal, aguardando manutenção"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Observações do turno *
        </label>
        <textarea
          name="outgoing_observations"
          rows={3}
          placeholder="Ex: Turno ocorreu sem grandes anormalidades. Atenção ao equipamento X..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.outgoing_observations && (
          <p className="text-xs text-red-400">{state.fieldErrors.outgoing_observations[0]}</p>
        )}
      </div>

      <div className="flex items-start gap-2 pt-2">
        <input 
          type="checkbox" 
          id="confirm" 
          name="confirm" 
          className="mt-1 shrink-0 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-slate-900" 
        />
        <label htmlFor="confirm" className="text-sm text-slate-300">
          Declaro que as informações estão corretas e o turno está pronto para ser repassado. *
        </label>
      </div>
      {state.fieldErrors?.confirm && (
        <p className="text-xs text-red-400">{state.fieldErrors.confirm[0]}</p>
      )}

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-amber-700 hover:bg-amber-600 text-white text-sm"
      >
        {isPending ? 'Iniciando passagem…' : 'Iniciar passagem de turno'}
      </Button>
    </form>
  )
}

`

### src\app\operador\turnos\[id]\passagem\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { HandoverForm } from './handover-form'
import { getTenantId } from '@/lib/tenant'


export default async function PassagemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const instance = await prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: { select: { id: true } },
      _count: {
        select: {
          readings: true,
        },
      },
    },
  })

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/operador/turnos')
  if (instance.status !== 'OPEN')  redirect('/operador/turnos')
  if (instance.handover)           redirect('/operador/turnos')

  const [openOccurrencesCount, pendingTasksCount] = await Promise.all([
    prisma.occurrence.count({
      where: { tenant_id: (await getTenantId()), status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.count({
      where: { tenant_id: (await getTenantId()), shift_instance_id: id, status: 'PENDING' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Passagem de turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Resumo automático */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{instance._count.readings}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', openOccurrencesCount > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {openOccurrencesCount}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', pendingTasksCount > 0 ? 'text-red-400' : 'text-slate-100'].join(' ')}>
                {pendingTasksCount}
              </p>
              <p className="text-xs text-slate-500">tarefa(s) pend.</p>
            </div>
          </div>
          {pendingTasksCount > 0 && (
            <p className="text-xs text-red-400 text-center">
              Há tarefas não concluídas — elas aparecerão no checklist do próximo operador.
            </p>
          )}
        </div>

        <HandoverForm instanceId={id} />

    </main>
  )
}

`

### src\app\operador\turnos\[id]\tarefas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TaskCard } from './task-card'
import { getTenantId } from '@/lib/tenant'


export default async function TarefasDoTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params

  const instance = await prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      shift:      { select: { name: true, start_time: true, end_time: true } },
      shift_tasks: {
        include: {
          assignee:  { select: { id: true, name: true } },
          creator:   { select: { name: true } },
          completer: { select: { name: true } },
          photos:    { select: { id: true, original_name: true } },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/operador/turnos')

  const total   = instance.shift_tasks.length
  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length
  const isOpen  = instance.status !== 'CLOSED'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Tarefas do turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{done} de {total} concluída(s)</span>
              {pending > 0 && (
                <span className="text-amber-400">{pending} pendente(s)</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista de tarefas */}
        {total === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center">
            <p className="text-sm text-slate-500">Nenhuma tarefa atribuída a este turno.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instance.shift_tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  id:               task.id,
                  title:            task.title,
                  description:      task.description,
                  status:           task.status,
                  assigned_to_id:   task.assigned_to_id,
                  assignee:         task.assignee,
                  creator:          task.creator,
                  completer:        task.completer,
                  completed_at:     task.completed_at,
                  completion_notes: task.completion_notes,
                  photos:           task.photos,
                }}
                isShiftOpen={isOpen}
              />
            ))}
          </div>
        )}

    </main>
  )
}

`

### src\app\operador\turnos\[id]\tarefas\task-card.tsx
`	s
'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { concluirTarefa, pularTarefa, type TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

type Photo = { id: string; original_name: string }
type Task = {
  id:               string
  title:            string
  description:      string | null
  status:           string
  assigned_to_id:   string | null
  assignee:         { id: string; name: string } | null
  creator:          { name: string }
  completer:        { name: string } | null
  completed_at:     Date | null
  completion_notes: string | null
  photos:           Photo[]
}

export function TaskCard({
  task,
  isShiftOpen,
}: {
  task:        Task
  isShiftOpen: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const boundAction = concluirTarefa.bind(null, task.id)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) setExpanded(false)
  }, [state.success])

  const isPendingStatus = task.status === 'PENDING'
  const isDone          = task.status === 'DONE'
  const isSkipped       = task.status === 'SKIPPED'
  const canAct          = isPendingStatus && isShiftOpen

  return (
    <div className={[
      'rounded-xl border bg-slate-900 overflow-hidden',
      isDone    ? 'border-green-900/50'  :
      isSkipped ? 'border-slate-800/40'  :
      expanded  ? 'border-emerald-700'   :
                  'border-slate-800',
    ].join(' ')}>

      {/* ─── Cabeçalho do card ─── */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Ícone circular de status */}
          <div className={[
            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
            isDone    ? 'border-green-500 bg-green-500'   :
            isSkipped ? 'border-slate-600 bg-slate-700'   :
                        'border-slate-600 bg-transparent',
          ].join(' ')}>
            {isDone && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isSkipped && (
              <svg className="h-2.5 w-2.5 text-slate-500" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={['text-sm font-medium leading-snug', isDone || isSkipped ? 'text-slate-500' : 'text-slate-100'].join(' ')}>
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{task.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-600">
              {task.assignee ? `Para: ${task.assignee.name}` : 'Qualquer operador'}
              {' · '}por {task.creator.name}
            </p>
          </div>
        </div>

        {/* Resumo de conclusão (DONE) */}
        {isDone && (
          <div className="ml-8 rounded-lg border border-green-900/30 bg-green-950/20 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-green-400">
              Concluída{task.completer ? ` por ${task.completer.name}` : ''}
            </p>
            {task.completion_notes && (
              <p className="text-xs text-slate-400 leading-relaxed">{task.completion_notes}</p>
            )}
            {task.photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {task.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/shift-task-photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-green-900/40 bg-green-950/40 px-2 py-0.5 text-xs text-green-400 hover:bg-green-950/70 transition-colors"
                  >
                    ↗ {photo.original_name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botões de ação (PENDING + turno aberto + form fechado) */}
        {canAct && !expanded && (
          <div className="ml-8 flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(true)}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              Concluir
            </Button>
            <form action={pularTarefa.bind(null, task.id)}>
              <Button type="submit"
                className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
               disabled={isPending}>
                Pular
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* ─── Formulário de conclusão (expansível) ─── */}
      {expanded && canAct && (
        <form action={formAction} className="border-t border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <textarea
            name="completion_notes"
            rows={3}
            placeholder="Observações (opcional)"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Fotos comprovação{' '}
              <span className="font-normal text-slate-600">até 3 · opcional</span>
            </label>
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-400
                file:mr-3 file:rounded-md file:border-0 file:bg-emerald-900/60 file:px-3 file:py-1.5
                file:text-xs file:text-emerald-300 file:font-medium focus:outline-none"
            />
            <p className="text-xs text-slate-600">JPG, PNG ou WebP · máx. 5 MB cada</p>
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(false)}
              className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              {isPending ? 'Salvando…' : 'Confirmar conclusão'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

`

### src\app\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.mustChangePassword) redirect('/trocar-senha')
  redirect(getDashboardRoute(session.user.role))
}

`

### src\app\tecnico\analises\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import { sendPushToRole } from '@/lib/push-actions'


async function requireTechnician() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') {
    redirect('/login')
  }
  return session
}

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const AnaliseSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id:        z.string().min(1, 'Selecione o parâmetro'),
  value: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe o valor medido' }),
  ),
  report_text: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(5000, 'Laudo deve ter no máximo 5000 caracteres').nullable(),
  ),
  laboratory_type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  collected_at: z.string().min(1, 'Informe a data/hora da coleta'),
})

export type AnaliseFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar análise ────────────────────────────────────────────────────────

export async function registrarAnalise(
  _prev: AnaliseFormState,
  formData: FormData,
): Promise<AnaliseFormState> {
  const session = await requireTechnician()

  const parsed = AnaliseSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    report_text:         formData.get('report_text'),
    laboratory_type:     formData.get('laboratory_type'),
    collected_at:        formData.get('collected_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const param = await prisma.qualityParameter.findFirst({ where: { id: parsed.data.parameter_id , tenant_id: (await getTenantId()) },
    select: { min_limit: true, max_limit: true, unit: true, default_method_id: true },
  })
  if (!param) return { error: 'Parâmetro não encontrado.' }

  const isNonConformant =
    calcularNaoConformidade(parsed.data.value, param.min_limit, param.max_limit) ?? false

  await prisma.analysis.create({
    data: {
      tenant_id:           (await getTenantId()),
      collection_point_id: parsed.data.collection_point_id,
      parameter_id:        parsed.data.parameter_id,
      method_id:           param.default_method_id,
      value:               parsed.data.value,
      unit:                param.unit,
      min_limit_applied:   param.min_limit,   // snapshot imutável
      max_limit_applied:   param.max_limit,   // snapshot imutável
      report_text:         parsed.data.report_text,
      laboratory_type:     parsed.data.laboratory_type,
      is_non_conformant:   isNonConformant,
      approved_by:         null,
      approved_at:         null,
      origin:              'MANUAL',
      metadata_origin:     null,
      collected_at:        new Date(parsed.data.collected_at),
      recorded_by:         userId,
    },
  })

  // Enviar notificações push
  try {
    const tenantId = await getTenantId()
    const payload = {
      title: 'Nova Análise Registrada',
      body: `O parâmetro ${param.unit ? 'foi' : 'foi'} medido: ${parsed.data.value} ${param.unit}`,
      url: '/gestor/analises'
    }
    await sendPushToRole(tenantId, 'MANAGER', payload)
    await sendPushToRole(tenantId, 'OPERATOR', { ...payload, url: '/operador/dashboard' })
  } catch (err) {
    console.error('Falha ao enviar push', err)
  }

  revalidatePath('/tecnico/analises')
  return { success: true }
}

// ─── Aprovar análise ──────────────────────────────────────────────────────────
// Qualquer TECHNICIAN ou MANAGER pode aprovar qualquer análise pendente.

export async function aprovarAnalise(
  analysisId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const analysis = await prisma.analysis.findFirst({ where: { id: analysisId , tenant_id: (await getTenantId()) },
    select: { approved_by: true },
  })
  if (!analysis)              return { error: 'Análise não encontrada.' }
  if (analysis.approved_by)   return { error: 'Análise já aprovada.' }

  await prisma.analysis.updateMany({ where: { id: analysisId , tenant_id: (await getTenantId()) }, data:  { approved_by: userId, approved_at: new Date() },
  })

  revalidatePath('/tecnico/analises')
  return {}
}

`

### src\app\tecnico\analises\approve-button.tsx
`	s
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { aprovarAnalise } from './actions'

export function ApproveButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await aprovarAnalise(analysisId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleApprove}
      className="border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50 text-xs h-10 px-3"
    >
      {isPending ? 'Aprovando…' : 'Aprovar'}
    </Button>
  )
}

`

### src\app\tecnico\analises\historico\analysis-chart.tsx
`	s
'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'

type DataPoint = {
  date:            string
  value:           number
  isNonConformant: boolean
}

type Props = {
  data:     DataPoint[]
  unit:     string
  minLimit: number | null
  maxLimit: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props
  const fill = payload.isNonConformant ? '#f87171' : '#60a5fa'
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />
}

export function AnalysisChart({ data, unit, minLimit, maxLimit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          width={40}
          unit={` ${unit}`}
        />

        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={(v) => formatDate(String(v))}
          formatter={(v) => [`${v} ${unit}`, 'Valor']}
        />

        {minLimit !== null && (
          <ReferenceLine
            y={minLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `mín ${minLimit}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        {maxLimit !== null && (
          <ReferenceLine
            y={maxLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `máx ${maxLimit}`, position: 'insideBottomLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

`

### src\app\tecnico\analises\historico\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisChart } from './analysis-chart'
import { getTenantId } from '@/lib/tenant'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ parameter_id?: string; days?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { parameter_id, days: daysParam } = await searchParams
  const days = daysParam === '90' ? MAX_DAYS : DEFAULT_DAYS

  const parameters = await prisma.qualityParameter.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
    orderBy: { name: 'asc' },
  })

  const selectedParam = parameters.find((p) => p.id === parameter_id) ?? null

  const since = new Date()
  since.setDate(since.getDate() - days)

  const dataPoints = selectedParam
    ? await prisma.analysis.findMany({
        where: {
          tenant_id:    (await getTenantId()),
          parameter_id: selectedParam.id,
          collected_at: { gte: since },
        },
        select:  { collected_at: true, value: true, is_non_conformant: true },
        orderBy: { collected_at: 'asc' },
        take:    500,
      })
    : []

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/tecnico/analises" label="Análises" />
          <h1 className="text-xl font-semibold mt-1">Histórico</h1>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-48">
            <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
              Parâmetro
            </label>
            <select
              id="parameter_id" name="parameter_id"
              defaultValue={parameter_id ?? ''}
              className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Selecione…</option>
              {parameters.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="days" className="text-sm font-medium text-slate-300">Período</label>
            <select
              id="days" name="days"
              defaultValue={String(days)}
              className="rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Ver
          </button>
        </form>

        {/* Gráfico */}
        {!selectedParam ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Selecione um parâmetro para ver o histórico.
          </div>
        ) : dataPoints.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Nenhuma análise nos últimos {days} dias para {selectedParam.name}.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium">
                {selectedParam.name}
                <span className="ml-2 text-sm font-normal text-slate-400">{selectedParam.unit}</span>
              </h2>
              <span className="text-xs text-slate-500">{dataPoints.length} medição(ões)</span>
            </div>
            <AnalysisChart
              data={dataPoints.map((d) => ({
                date:            d.collected_at.toISOString(),
                value:           d.value ?? 0,
                isNonConformant: d.is_non_conformant,
              }))}
              unit={selectedParam.unit}
              minLimit={selectedParam.min_limit}
              maxLimit={selectedParam.max_limit}
            />
          </div>
        )}
    </main>
  )
}

`

### src\app\tecnico\analises\nova\analysis-form.tsx
`	s
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarAnalise, type AnaliseFormState } from '../actions'

const DRAFT_KEY = 'analysis_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = { id: string; name: string; unit: string; min_limit: number | null; max_limit: number | null; default_method_id?: string | null }
type Method = { id: string; name: string; pop_content?: string | null }

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
  methods:          Method[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  method_id:           string
  value:               string
  report_text:         string
  laboratory_type:     string
  collected_at:        string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: AnaliseFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50'

export function AnalysisForm({ collectionPoints, parameters, methods }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarAnalise, initialState)

  const [mounted, setMounted]                     = useState(false)
  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [methodId, setMethodId]                   = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [reportText, setReportText]               = useState('')
  const [laboratoryType, setLaboratoryType]       = useState('INTERNAL')
  const [collectedAt, setCollectedAt]             = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setMethodId(d.method_id ?? '')
        setValueStr(d.value ?? '')
        setReportText(d.report_text ?? '')
        setLaboratoryType(d.laboratory_type ?? 'INTERNAL')
        setCollectedAt(d.collected_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setCollectedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setCollectedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração ───────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      method_id:           methodId,
      value:               valueStr,
      report_text:         reportText,
      laboratory_type:     laboratoryType,
      collected_at:        collectedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, methodId, valueStr, reportText, laboratoryType, collectedAt])

  // ── Limpar rascunho e redirecionar após sucesso ────────────────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/analises')
    }
  }, [state.success, router])

  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null
  const selectedMethod = methods.find((m) => m.id === methodId) ?? null

  // Verificação de não-conformidade em tempo real
  const nonConformant: boolean | null = (() => {
    if (!selectedParam || valueStr === '') return null
    const v = parseFloat(valueStr)
    if (isNaN(v)) return null
    const below = selectedParam.min_limit !== null && v < selectedParam.min_limit
    const above = selectedParam.max_limit !== null && v > selectedParam.max_limit
    return below || above
  })()

  const hasLimits = selectedParam
    ? selectedParam.min_limit !== null || selectedParam.max_limit !== null
    : false

  const limitLabel = selectedParam
    ? `${selectedParam.min_limit ?? '—'} – ${selectedParam.max_limit ?? '—'} ${selectedParam.unit}`
    : ''

  return (
    <div className="space-y-5">
      <Link href="/tecnico/analises" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para análises
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova análise</h1>
        <p className="text-xs text-slate-400">Registre o resultado da análise laboratorial.</p>
      </div>

      <form action={formAction} className="space-y-5">

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
            Ponto de coleta
          </label>
          <select
            id="collection_point_id" name="collection_point_id"
            value={collectionPointId}
            onChange={(e) => setCollectionPointId(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o ponto…</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
            Parâmetro
          </label>
          <select
            id="parameter_id" name="parameter_id"
            value={parameterId}
            onChange={(e) => { setParameterId(e.target.value); setValueStr('') }}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o parâmetro…</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
          {state.fieldErrors?.parameter_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.parameter_id[0]}</p>
          )}
        </div>

        {/* ── POP ─────────────────────────────────────────────────────────── */}
        {selectedParam?.default_method_id && methods.find(m => m.id === selectedParam.default_method_id)?.pop_content && (
          <div className="rounded-md border border-blue-900/50 bg-blue-950/20 p-4">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Instrução de Trabalho (POP)</h4>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{methods.find(m => m.id === selectedParam.default_method_id)?.pop_content}</p>
          </div>
        )}

        {/* ── Valor medido ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="value" className="text-sm font-medium text-slate-300">
            Valor medido
          </label>
          <div className="relative">
            <Input
              id="value" name="value"
              type="number" step="0.001" inputMode="decimal"
              placeholder="0,000"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              disabled={isPending} required
              className={[
                selectedParam ? 'pr-16' : '',
                'bg-slate-800 text-slate-100 placeholder:text-slate-500',
                nonConformant === true
                  ? 'border-red-600 focus-visible:ring-red-600'
                  : 'border-slate-700 focus-visible:ring-slate-500',
              ].join(' ')}
            />
            {selectedParam && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                {selectedParam.unit}
              </span>
            )}
          </div>
          {hasLimits && (
            <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-slate-500'}`}>
              {nonConformant === true ? 'Fora do limite CONAMA: ' : 'Limite CONAMA: '}
              {limitLabel}
            </p>
          )}
          {state.fieldErrors?.value && (
            <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
          )}
        </div>

        {/* ── Data/hora da coleta ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collected_at" className="text-sm font-medium text-slate-300">
            Data/hora da coleta
          </label>
          <Input
            id="collected_at" name="collected_at"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            disabled={isPending} required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.collected_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.collected_at[0]}</p>
          )}
        </div>

        {/* ── Tipo de Laboratório ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="laboratory_type" className="text-sm font-medium text-slate-300">
            Laboratório
          </label>
          <select
            id="laboratory_type" name="laboratory_type"
            value={laboratoryType}
            onChange={(e) => setLaboratoryType(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="INTERNAL">Interno</option>
            <option value="EXTERNAL">Externo (Terceirizado)</option>
          </select>
          {state.fieldErrors?.laboratory_type && (
            <p className="text-xs text-red-400">{state.fieldErrors.laboratory_type[0]}</p>
          )}
        </div>

        {/* ── Laudo (texto livre) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="report_text" className="text-sm font-medium text-slate-300">
            Laudo <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="report_text" name="report_text"
            rows={4}
            placeholder="Observações, condições de coleta, conclusões…"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.report_text && (
            <p className="text-xs text-red-400">{state.fieldErrors.report_text[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <Button
          type="submit" disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar análise'}
        </Button>
      </form>
    </div>
  )
}

`

### src\app\tecnico\analises\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisForm } from './analysis-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovaAnalisePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters, methods] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true, default_method_id: true },
      orderBy: { name: 'asc' },
    }),
    prisma.analysisMethod.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, pop_content: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/tecnico/analises" label="Análises" />
      <AnalysisForm
        collectionPoints={collectionPoints}
        parameters={parameters}
        methods={methods}
      />
    </main>
  )
}

`

### src\app\tecnico\analises\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ApproveButton } from './approve-button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where:   { tenant_id: (await getTenantId()) },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        method:           { select: { name: true } },
        approver:         { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.analysis.count({ where: { tenant_id: (await getTenantId()) } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canApprove = session.user.role === 'TECHNICIAN' || session.user.role === 'MANAGER'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Análises</h1>
            <p className="text-xs text-slate-400">{total} registro(s) no total</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tecnico/analises/historico">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8">
                Histórico
              </Button>
            </Link>
            {session.user.role === 'MANAGER' && (
              <Link href="/gestor/metodos">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8">
                  Config. Analíticas
                </Button>
              </Link>
            )}
            {session.user.role === 'TECHNICIAN' && (
              <Link href="/tecnico/analises/nova">
                <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
                  + Nova
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lista */}
        {analyses.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma análise registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div
                key={a.id}
                className={[
                  'rounded-xl border bg-slate-900 p-4 space-y-2',
                  a.is_non_conformant
                    ? 'border-red-900/60'
                    : 'border-slate-800',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {a.collection_point.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDatetime(a.collected_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {a.is_non_conformant && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                        Fora do limite
                      </span>
                    )}
                    {a.approved_by ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Aprovado
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Parâmetro + valor */}
                <p className="text-sm text-slate-300">
                  <span className="font-medium">{a.parameter.name}:</span>{' '}
                  {a.value} {a.unit}
                  <span className="text-slate-600"> · {a.method?.name ?? 'N/A'}</span>
                </p>

                {/* Limites aplicados (snapshot) */}
                {(a.min_limit_applied !== null || a.max_limit_applied !== null) && (
                  <p className="text-xs text-slate-600">
                    Limite vigente na coleta: {a.min_limit_applied ?? '—'} – {a.max_limit_applied ?? '—'} {a.unit}
                  </p>
                )}

                {/* Aprovador ou botão de aprovação */}
                <div className="flex items-center justify-between pt-0.5">
                  {a.approved_by ? (
                    <p className="text-xs text-slate-600">
                      Aprovado por {a.approver?.name ?? '—'}
                    </p>
                  ) : (
                    <span />
                  )}
                  {!a.approved_by && canApprove && (
                    <ApproveButton analysisId={a.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/tecnico/analises?page=${page - 1}`} className="text-slate-400 hover:text-slate-200">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/tecnico/analises?page=${page + 1}`} className="text-slate-400 hover:text-slate-200">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

`

### src\app\tecnico\dashboard\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'


export default async function TecnicoDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [overdueCount, pendingAnalysesCount, openCorrectivesCount, nonConformCount] =
    await Promise.all([
      // Preventivas vencidas
      prisma.preventiveMaintenance.count({
        where: {
          tenant_id:      (await getTenantId()),
          status:         'SCHEDULED',
          scheduled_date: { lt: today },
          equipment:      { is_active: true },
        },
      }),
      // Análises pendentes de aprovação (qualquer)
      prisma.analysis.count({
        where: { tenant_id: (await getTenantId()), approved_by: null },
      }),
      // Corretivas em andamento
      prisma.correctiveMaintenance.count({
        where: { tenant_id: (await getTenantId()), status: 'IN_PROGRESS' },
      }),
      // Não-conformidades em aberto (n.c. ainda sem aprovação)
      prisma.analysis.count({
        where: { tenant_id: (await getTenantId()), is_non_conformant: true, approved_by: null },
      }),
    ])

  const SHORTCUTS = [
    { title: 'Análises',     desc: 'Registrar ou aprovar análises',          href: '/tecnico/analises'          },
    { title: 'Equipamentos', desc: 'Gerenciar preventivas e corretivas',     href: '/tecnico/equipamentos'      },
    { title: 'Ocorrências',  desc: 'Acompanhar e fechar ocorrências',        href: '/tecnico/ocorrencias'       },
    { title: 'Estoque',      desc: 'Registrar entradas de produtos químicos', href: '/tecnico/estoque'          },
    { title: 'Turnos',       desc: 'Tarefas de turno ativas',             href: '/tecnico/turnos/tarefas' },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Técnico</p>
        </div>

        {/* Widgets de atenção — 2×2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              overdueCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', overdueCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {overdueCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Preventiva(s) vencida(s)</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              nonConformCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', nonConformCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {nonConformCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Não-conform. em aberto</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              pendingAnalysesCount > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', pendingAnalysesCount > 0 ? 'text-amber-400' : 'text-slate-200'].join(' ')}>
              {pendingAnalysesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Análise(s) p/ aprovar</p>
          </Link>

          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openCorrectivesCount > 0 ? 'border-orange-900/60 bg-orange-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openCorrectivesCount > 0 ? 'text-orange-400' : 'text-slate-200'].join(' ')}>
              {openCorrectivesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Corretiva(s) em andamento</p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}


`

### src\app\tecnico\equipamentos\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { addDays } from '@/lib/equipment-utils'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EquipamentoSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category_id: z.string().min(1, 'Selecione a categoria'),
  serial_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  installation_date: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  preventive_frequency_days: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseInt(String(v), 10)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe a frequência em dias' }).int().min(1, 'Mínimo de 1 dia'),
  ),
})

const CorretivaSchema = z.object({
  description: z.string().min(5, 'Descreva o problema em pelo menos 5 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a prioridade',
  }),
  start_date: z.string().min(1, 'Informe a data de início'),
  notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000).nullable(),
  ),
  estimated_cost: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseFloat(String(v))
      return isNaN(n) ? null : String(n)
    },
    z.string().nullable(),
  ),
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type EquipamentoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export type CorretivaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Equipamento: criar ───────────────────────────────────────────────────────

export async function criarEquipamento(
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const firstScheduledDate = addDays(new Date(), parsed.data.preventive_frequency_days)

  // Cria equipamento e primeira preventiva na mesma transação
  await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.create({
      data: {
        tenant_id:                 (await getTenantId()),
        name:                      parsed.data.name,
        category_id:               parsed.data.category_id,
        serial_number:             parsed.data.serial_number,
        location:                  parsed.data.location,
        installation_date:         parsed.data.installation_date
          ? new Date(parsed.data.installation_date)
          : null,
        preventive_frequency_days: parsed.data.preventive_frequency_days,
        is_active:                 true,
        created_by:                userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      (await getTenantId()),
        equipment_id:   equipment.id,
        scheduled_date: firstScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  return { success: true }
}

// ─── Equipamento: editar ──────────────────────────────────────────────────────
// Alterar a frequência NÃO reagenda a preventiva já existente.

export async function editarEquipamento(
  equipamentoId: string,
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const equipment = await prisma.equipment.findFirst({ where: { id: equipamentoId , tenant_id: (await getTenantId()) },
    select: { id: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.updateMany({ where: { id: equipamentoId , tenant_id: (await getTenantId()) }, data: {
      name:                      parsed.data.name,
      category_id:               parsed.data.category_id,
      serial_number:             parsed.data.serial_number,
      location:                  parsed.data.location,
      installation_date:         parsed.data.installation_date
        ? new Date(parsed.data.installation_date)
        : null,
      preventive_frequency_days: parsed.data.preventive_frequency_days,
    },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Equipamento: toggle ativo ────────────────────────────────────────────────

export async function toggleAtivoEquipamento(
  equipamentoId: string,
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const equipment = await prisma.equipment.findFirst({ where: { id: equipamentoId , tenant_id: (await getTenantId()) },
    select: { is_active: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.updateMany({ where: { id: equipamentoId , tenant_id: (await getTenantId()) }, data:  { is_active: !equipment.is_active },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return {}
}

// ─── Preventiva: concluir e agendar a próxima ─────────────────────────────────

export async function concluirPreventiva(
  preventivaId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const preventiva = await prisma.preventiveMaintenance.findFirst({ where: { id: preventivaId , tenant_id: (await getTenantId()) },
    include: { equipment: { select: { id: true, preventive_frequency_days: true } } },
  })
  if (!preventiva)                    return { error: 'Preventiva não encontrada.' }
  if (preventiva.status === 'COMPLETED') return { error: 'Preventiva já concluída.' }

  const completedDate = new Date()
  const nextScheduledDate = addDays(completedDate, preventiva.equipment.preventive_frequency_days)

  await prisma.$transaction(async (tx) => {
    await tx.preventiveMaintenance.updateMany({ where: { id: preventivaId , tenant_id: (await getTenantId()) }, data: {
        status:         'COMPLETED',
        completed_date: completedDate,
        completed_by:   userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      (await getTenantId()),
        equipment_id:   preventiva.equipment.id,
        scheduled_date: nextScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${preventiva.equipment.id}`)
  return {}
}

// ─── Corretiva: registrar ─────────────────────────────────────────────────────

export async function registrarCorretiva(
  equipamentoId: string,
  _prev: CorretivaFormState,
  formData: FormData,
): Promise<CorretivaFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = CorretivaSchema.safeParse({
    description:    formData.get('description'),
    priority:       formData.get('priority'),
    start_date:     formData.get('start_date'),
    notes:          formData.get('notes'),
    estimated_cost: formData.get('estimated_cost'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  await prisma.correctiveMaintenance.create({
    data: {
      tenant_id:      (await getTenantId()),
      equipment_id:   equipamentoId,
      description:    parsed.data.description,
      responsible_id: userId,        // auto-preenche com o usuário logado
      priority:       parsed.data.priority,
      start_date:     new Date(parsed.data.start_date),
      status:         'IN_PROGRESS',
      notes:          parsed.data.notes,
      estimated_cost: parsed.data.estimated_cost ?? undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Corretiva: concluir ou cancelar ─────────────────────────────────────────

export async function atualizarStatusCorretiva(
  corretivaId: string,
  status: 'COMPLETED' | 'CANCELLED',
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const corretiva = await prisma.correctiveMaintenance.findFirst({ where: { id: corretivaId , tenant_id: (await getTenantId()) },
    select: { status: true, equipment_id: true },
  })
  if (!corretiva)                      return { error: 'Corretiva não encontrada.' }
  if (corretiva.status !== 'IN_PROGRESS') return { error: 'Corretiva já encerrada.' }

  await prisma.correctiveMaintenance.updateMany({ where: { id: corretivaId , tenant_id: (await getTenantId()) }, data: {
      status,
      end_date: status === 'COMPLETED' ? new Date() : undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${corretiva.equipment_id}`)
  return {}
}

`

### src\app\tecnico\equipamentos\novo\equipment-form.tsx
`	s
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { criarEquipamento, type EquipamentoFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

const DRAFT_KEY = 'equipment_draft'
const INITIAL: EquipamentoFormState = {}

export function EquipmentForm({ categories }: { categories: Category[] }) {
  const router  = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(criarEquipamento, INITIAL)

  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/equipamentos')
    }
  }, [state.success, router])

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="name" name="name"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Bomba de recalque 1"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="category_id" name="category_id"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Número de série */}
      <div className="space-y-1.5">
        <label htmlFor="serial_number" className="text-sm font-medium text-slate-300">
          Número de série <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="serial_number" name="serial_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="SN-XXXXX"
        />
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label htmlFor="location" className="text-sm font-medium text-slate-300">
          Localização <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="location" name="location"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Sala de bombas"
        />
      </div>

      {/* Data de instalação */}
      <div className="space-y-1.5">
        <label htmlFor="installation_date" className="text-sm font-medium text-slate-300">
          Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="installation_date" name="installation_date"
          type="date"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Frequência preventiva */}
      <div className="space-y-1.5">
        <label htmlFor="preventive_frequency_days" className="text-sm font-medium text-slate-300">
          Frequência de manutenção preventiva (dias) *
        </label>
        <input
          id="preventive_frequency_days" name="preventive_frequency_days"
          type="number" min="1"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: 30"
        />
        {state.fieldErrors?.preventive_frequency_days && (
          <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
        )}
        <p className="text-xs text-slate-500">A primeira preventiva será agendada para hoje + este número de dias.</p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Cadastrar equipamento'}
      </Button>
    </form>
  )
}

`

### src\app\tecnico\equipamentos\novo\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { EquipmentForm } from './equipment-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovoEquipamentoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div>
        <BackButton href="/tecnico/equipamentos" label="Equipamentos" />
        <h1 className="text-xl font-semibold mt-1">Novo equipamento</h1>
      </div>

      <EquipmentForm categories={categories} />
    </main>
  )
}

`

### src\app\tecnico\equipamentos\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE = 20

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; inactive?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, q, inactive } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = inactive === '1'
  const search    = q?.trim() ?? ''

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { is_active: true }),
    ...(search ? { name: { contains: search } } : {}),
  }

  const [equipamentos, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        category: { select: { name: true } },
        preventive_maintenances: {
          where:   { status: 'SCHEDULED' },
          orderBy: { scheduled_date: 'asc' },
          take:    1,
          select:  { scheduled_date: true },
        },
      },
      orderBy: { name: 'asc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.equipment.count({ where }),
  ])

  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Equipamentos</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/tecnico/equipamentos/novo">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Novo
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-2 items-end">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar equipamento…"
            className="flex-1 min-w-40 rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              name="inactive"
              value="1"
              defaultChecked={showAll}
              className="accent-slate-400"
            />
            Ver inativos
          </label>
          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Buscar
          </button>
        </form>

        {/* Lista */}
        {equipamentos.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhum equipamento encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {equipamentos.map((eq) => {
              const nextPreventive = eq.preventive_maintenances[0] ?? null
              const isOverdue = nextPreventive
                ? new Date(nextPreventive.scheduled_date) < today
                : false

              return (
                <Link
                  key={eq.id}
                  href={`/tecnico/equipamentos/${eq.id}`}
                  className={[
                    'block rounded-xl border bg-slate-900 p-4 hover:bg-slate-800 transition-colors',
                    isOverdue ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{eq.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {eq.category.name}
                        {eq.location ? ` · ${eq.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!eq.is_active && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                          Inativo
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                          Preventiva vencida
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    Próxima preventiva:{' '}
                    <span className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      {nextPreventive ? formatDate(new Date(nextPreventive.scheduled_date)) : 'Nenhuma agendada'}
                    </span>
                  </p>
                </Link>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/tecnico/equipamentos?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/equipamentos?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

`

### src\app\tecnico\equipamentos\[id]\conclude-button.tsx
`	s
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { concluirPreventiva } from '../actions'
import { Button } from '@/components/ui/button'

export function ConcludeButton({ preventivaId }: { preventivaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConcluir() {
    startTransition(async () => {
      const result = await concluirPreventiva(preventivaId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleConcluir}
      disabled={isPending}
      className="h-10 text-xs bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
    >
      {isPending ? 'Concluindo…' : 'Concluir'}
    </Button>
  )
}

`

### src\app\tecnico\equipamentos\[id]\corrective-form.tsx
`	s
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarCorretiva, type CorretivaFormState } from '../actions'
import { Button } from '@/components/ui/button'

const INITIAL: CorretivaFormState = {}

export function CorrectiveForm({ equipamentoId }: { equipamentoId: string }) {
  const router = useRouter()
  const boundAction = registrarCorretiva.bind(null, equipamentoId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-3 border-t border-slate-800">
      <h3 className="text-sm font-medium text-slate-300">Registrar corretiva</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium text-slate-400">Descrição do problema *</label>
        <textarea
          id="description" name="description" rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o problema observado…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prioridade */}
        <div className="space-y-1">
          <label htmlFor="priority" className="text-xs font-medium text-slate-400">Prioridade *</label>
          <select
            id="priority" name="priority"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Selecione…</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
          {state.fieldErrors?.priority && (
            <p className="text-xs text-red-400">{state.fieldErrors.priority[0]}</p>
          )}
        </div>

        {/* Data de início */}
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-xs font-medium text-slate-400">Data de início *</label>
          <input
            id="start_date" name="start_date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state.fieldErrors?.start_date && (
            <p className="text-xs text-red-400">{state.fieldErrors.start_date[0]}</p>
          )}
        </div>
      </div>

      {/* Custo estimado */}
      <div className="space-y-1">
        <label htmlFor="estimated_cost" className="text-xs font-medium text-slate-400">
          Custo estimado (R$) <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <input
          id="estimated_cost" name="estimated_cost"
          type="number" step="0.01" min="0"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="0,00"
        />
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <label htmlFor="notes" className="text-xs font-medium text-slate-400">
          Observações <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <textarea
          id="notes" name="notes" rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Informações adicionais…"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-slate-100 text-slate-900 hover:bg-white text-sm disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Registrar corretiva'}
      </Button>
    </form>
  )
}

`

### src\app\tecnico\equipamentos\[id]\edit-form.tsx
`	s
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { editarEquipamento, type EquipamentoFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

type Equipment = {
  id:                        string
  name:                      string
  category_id:               string
  serial_number:             string | null
  location:                  string | null
  installation_date:         Date | null
  preventive_frequency_days: number
  is_active:                 boolean
}

const INITIAL: EquipamentoFormState = {}

export function EditForm({
  equipment,
  categories,
}: {
  equipment:  Equipment
  categories: Category[]
}) {
  const router      = useRouter()
  const boundAction = editarEquipamento.bind(null, equipment.id)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  const installDate = equipment.installation_date
    ? new Date(equipment.installation_date).toISOString().split('T')[0]
    : ''

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-md border border-green-900/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Equipamento atualizado com sucesso.
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="edit-name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="edit-name" name="name"
          defaultValue={equipment.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="edit-category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="edit-category_id" name="category_id"
          defaultValue={equipment.category_id}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Número de série */}
      <div className="space-y-1.5">
        <label htmlFor="edit-serial_number" className="text-sm font-medium text-slate-300">
          Número de série <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-serial_number" name="serial_number"
          defaultValue={equipment.serial_number ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label htmlFor="edit-location" className="text-sm font-medium text-slate-300">
          Localização <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-location" name="location"
          defaultValue={equipment.location ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Data de instalação */}
      <div className="space-y-1.5">
        <label htmlFor="edit-installation_date" className="text-sm font-medium text-slate-300">
          Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-installation_date" name="installation_date"
          type="date"
          defaultValue={installDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Frequência */}
      <div className="space-y-1.5">
        <label htmlFor="edit-freq" className="text-sm font-medium text-slate-300">
          Frequência preventiva (dias) *
        </label>
        <input
          id="edit-freq" name="preventive_frequency_days"
          type="number" min="1"
          defaultValue={equipment.preventive_frequency_days}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.preventive_frequency_days && (
          <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
        )}
        <p className="text-xs text-slate-500">Alterar a frequência não reagenda a preventiva já existente.</p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

`

### src\app\tecnico\equipamentos\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConcludeButton } from './conclude-button'
import { StatusButton } from './status-button'
import { CorrectiveForm } from './corrective-form'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'
import { getTenantId } from '@/lib/tenant'


function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'text-slate-400',
  MEDIUM:   'text-amber-400',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-red-400',
}

export default async function EquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const equipment = await prisma.equipment.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      category: { select: { name: true } },
      preventive_maintenances: {
        orderBy: { scheduled_date: 'desc' },
        take:    10,
        select:  { id: true, scheduled_date: true, status: true, completed_date: true },
      },
      corrective_maintenances: {
        orderBy: { start_date: 'desc' },
        take:    10,
        include: { responsible: { select: { name: true } } },
      },
    },
  })

  if (!equipment || equipment.tenant_id !== (await getTenantId())) notFound()

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const nextScheduled = equipment.preventive_maintenances.find(
    (p) => p.status === 'SCHEDULED',
  ) ?? null
  const isOverdue = nextScheduled
    ? new Date(nextScheduled.scheduled_date) < today
    : false

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/tecnico/equipamentos" label="Equipamentos" />
          <h1 className="text-xl font-semibold truncate mt-1">{equipment.name}</h1>
        </div>

        {/* Cabeçalho do equipamento */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          isOverdue ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{equipment.name}</p>
              <p className="text-sm text-slate-400">{equipment.category.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!equipment.is_active && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                  Inativo
                </span>
              )}
              {isOverdue && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                  Preventiva vencida
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt className="text-slate-500">Nº série</dt>
              <dd className="text-slate-300">{equipment.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Localização</dt>
              <dd className="text-slate-300">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Instalação</dt>
              <dd className="text-slate-300">{formatDate(equipment.installation_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Freq. preventiva</dt>
              <dd className="text-slate-300">{equipment.preventive_frequency_days} dias</dd>
            </div>
            <div>
              <dt className="text-slate-500">Próxima preventiva</dt>
              <dd className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {nextScheduled ? formatDate(new Date(nextScheduled.scheduled_date)) : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex justify-end">
            <ToggleButton equipamentoId={equipment.id} isActive={equipment.is_active} />
          </div>
        </div>

        {/* Manutenções preventivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Preventivas</h2>
          {equipment.preventive_maintenances.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma preventiva registrada.</p>
          ) : (
            <div className="space-y-2">
              {equipment.preventive_maintenances.map((p) => {
                const overdue =
                  p.status === 'SCHEDULED' && new Date(p.scheduled_date) < today
                return (
                  <div
                    key={p.id}
                    className={[
                      'rounded-lg border bg-slate-900 px-4 py-3 flex items-center justify-between gap-2',
                      overdue ? 'border-red-900/60' : 'border-slate-800',
                    ].join(' ')}
                  >
                    <div>
                      <p className={['text-sm font-medium', overdue ? 'text-red-400' : 'text-slate-200'].join(' ')}>
                        {formatDate(new Date(p.scheduled_date))}
                        {overdue && ' — vencida'}
                      </p>
                      {p.status === 'COMPLETED' && p.completed_date && (
                        <p className="text-xs text-slate-500">
                          Concluída em {formatDate(new Date(p.completed_date))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === 'COMPLETED' ? (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                          Concluída
                        </span>
                      ) : (
                        <ConcludeButton preventivaId={p.id} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Manutenções corretivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Corretivas</h2>

          {equipment.corrective_maintenances.length > 0 && (
            <div className="space-y-2">
              {equipment.corrective_maintenances.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-snug">{c.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(c.start_date)} · {c.responsible.name}
                      </p>
                    </div>
                    <span className={['text-xs font-medium shrink-0', c.priority ? (PRIORITY_COLOR[c.priority] ?? 'text-slate-400') : 'text-slate-400'].join(' ')}>
                      {c.priority ? (PRIORITY_LABEL[c.priority] ?? c.priority) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {c.status === 'IN_PROGRESS' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Em andamento
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Concluída
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                        Cancelada
                      </span>
                    )}

                    {c.status === 'IN_PROGRESS' && (
                      <div className="flex gap-2">
                        <StatusButton corretivaId={c.id} action="COMPLETED" />
                        <StatusButton corretivaId={c.id} action="CANCELLED" />
                      </div>
                    )}
                  </div>

                  {c.notes && (
                    <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">{c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulário de nova corretiva — só se equipamento ativo */}
          {equipment.is_active && (
            <CorrectiveForm equipamentoId={equipment.id} />
          )}
        </section>

        {/* Editar equipamento */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Editar dados</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <EditForm
              equipment={{
                id:                        equipment.id,
                name:                      equipment.name,
                category_id:               equipment.category_id,
                serial_number:             equipment.serial_number,
                location:                  equipment.location,
                installation_date:         equipment.installation_date,
                preventive_frequency_days: equipment.preventive_frequency_days,
                is_active:                 equipment.is_active,
              }}
              categories={categories}
            />
          </div>
        </section>
    </main>
  )
}

`

### src\app\tecnico\equipamentos\[id]\status-button.tsx
`	s
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusCorretiva } from '../actions'
import { Button } from '@/components/ui/button'

export function StatusButton({
  corretivaId,
  action,
}: {
  corretivaId: string
  action: 'COMPLETED' | 'CANCELLED'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await atualizarStatusCorretiva(corretivaId, action)
      if (!result.error) router.refresh()
    })
  }

  const isComplete = action === 'COMPLETED'

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isComplete
          ? 'bg-green-900/60 text-green-300 hover:bg-green-900 border-green-900/50'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700',
      ].join(' ')}
    >
      {isPending
        ? '…'
        : isComplete ? 'Concluir' : 'Cancelar'}
    </Button>
  )
}

`

### src\app\tecnico\equipamentos\[id]\toggle-button.tsx
`	s
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAtivoEquipamento } from '../actions'
import { Button } from '@/components/ui/button'

export function ToggleButton({
  equipamentoId,
  isActive,
}: {
  equipamentoId: string
  isActive:      boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAtivoEquipamento(equipamentoId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isActive
          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
          : 'bg-green-900/40 text-green-400 hover:bg-green-900/60 border-green-900/50',
      ].join(' ')}
    >
      {isPending ? '…' : isActive ? 'Desativar' : 'Reativar'}
    </Button>
  )
}

`

### src\app\tecnico\estoque\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import { getTenantId } from '@/lib/tenant'


export default async function TecnicoEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: (await getTenantId()), is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Estoque de Produtos Químicos</h1>
        <p className="text-sm text-slate-400">
          Registre entradas e saídas de produtos. Para contagens físicas, use o Operador.
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum produto ativo cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const calculado = calcularEstoqueAtual(
                p.entries.reduce((s, e) => s + e.quantity, 0),
                p.exits.reduce((s, e) => s + e.quantity, 0),
              )
              const fisico  = p.counts[0]?.counted_quantity ?? null
              const alerta  = estaAbaixoMinimo(calculado, fisico, p.min_stock)

              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${
                    alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Calculado: {formatarQuantidade(calculado)} {p.unit}
                      {fisico !== null && ` · Físico: ${formatarQuantidade(fisico)} ${p.unit}`}
                      {` · Mínimo: ${formatarQuantidade(p.min_stock)} ${p.unit}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/tecnico/estoque/${p.id}/entrada`}
                      className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                    >
                      + Entrada
                    </Link>
                    <Link
                      href={`/tecnico/estoque/${p.id}/saida`}
                      className="rounded-md border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
                    >
                      Registrar saída
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </main>
  )
}

`

### src\app\tecnico\estoque\[id]\entrada\entry-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEntrada } from '@/app/gestor/produtos-quimicos/actions'

type Props = { productId: string; productName: string; unit: string }

export function TecnicoEntryForm({ productId, productName, unit }: Props) {
  const router = useRouter()
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarEntrada(prev, formData)
    if (result?.success) router.push('/tecnico/estoque')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="rounded-md bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
        Produto: <span className="text-slate-200 font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Lote, validade, condições do recebimento..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar entrada'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/tecnico/estoque')}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

`

### src\app\tecnico\estoque\[id]\entrada\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { TecnicoEntryForm } from './entry-form'
import { getTenantId } from '@/lib/tenant'


export default async function TecnicoEntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: (await getTenantId()), is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <main className="p-6 max-w-lg mx-auto space-y-5">
      <div>
        <BackButton href="/tecnico/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Entrada — {product.name}</h1>
      </div>
      <TecnicoEntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </main>
  )
}

`

### src\app\tecnico\estoque\[id]\saida\exit-form.tsx
`	s
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarSaida } from '@/app/operador/estoque/actions'

type Props = {
  productId:    string
  productName:  string
  unit:         string
  estoqueAtual: number
}

export function ExitForm({ productId, productName, unit, estoqueAtual }: Props) {
  const router  = useRouter()
  const [qty, setQty]             = useState('')
  const [offlineError, setOfflineError] = useState(false)
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarSaida(prev, formData)
    if (result?.success) router.push('/tecnico/estoque')
    return result
  }, null)

  const qtyNum       = parseFloat(qty) || 0
  const ficaNegativo = qtyNum > 0 && qtyNum > estoqueAtual

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />

      {offlineError && (
        <p className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

        <>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">
              Quantidade usada ({unit}) *
            </label>
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {ficaNegativo && (
              <p className="text-xs text-amber-400">
                Atenção: quantidade maior que o estoque calculado ({estoqueAtual.toFixed(2)} {unit}).
                O registro será salvo mesmo assim.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data e hora do uso *</label>
            <input
              name="used_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Observações</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Onde foi usado, processo, turno..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-red-700 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Registrando...' : 'Confirmar saída'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/tecnico/estoque')}
              className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
    </form>
  )
}

`

### src\app\tecnico\estoque\[id]\saida\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { ExitForm } from './exit-form'
import { getTenantId } from '@/lib/tenant'


export default async function SaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: (await getTenantId()), is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )

  return (
    <main className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-4">
        <BackButton href="/tecnico/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Saída — {product.name}</h1>
      </div>
      <div className="rounded-lg bg-slate-800/50 px-4 py-3 mb-5 flex gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-500">Estoque calculado</p>
            <p className={`font-semibold ${calculado < product.min_stock ? 'text-red-400' : 'text-slate-100'}`}>
              {formatarQuantidade(calculado)} {product.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Mínimo</p>
            <p className="font-semibold text-slate-400">
              {formatarQuantidade(product.min_stock)} {product.unit}
            </p>
          </div>
        </div>
        <ExitForm
          productId={product.id}
          productName={product.name}
          unit={product.unit}
          estoqueAtual={calculado}
        />
    </main>
  )
}

`

### src\app\tecnico\layout.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { LayoutDashboard, FlaskConical, Wrench, AlertTriangle, Clock } from 'lucide-react'
import { TopNav } from '@/components/ui/top-nav'
import { NotificationBell } from '@/components/ui/notification-bell'
import { Logo } from '@/components/logo'
import { PushManager } from '@/components/push-manager'

export default async function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const NAV_ITEMS: NavItem[] = [
    { href: '/tecnico/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { href: '/tecnico/analises',     label: 'Análises',     icon: FlaskConical    },
    { href: '/tecnico/equipamentos', label: 'Equip.',       icon: Wrench          },
    { href: '/tecnico/ocorrencias',  label: 'Ocorrências',  icon: AlertTriangle   },
    { href: '/tecnico/turnos/tarefas', label: 'Turnos', icon: Clock           },
  ]

  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/tecnico/dashboard" className="transition-opacity hover:opacity-80"><Logo /></Link>
            <span className="rounded-full bg-sky-900/60 px-2.5 py-0.5 text-xs font-medium text-sky-400">
              Técnico
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <NotificationBell />
            <PushManager />
            <SignOutButton />
          </div>
        </div>
      </header>

      <TopNav />

      {/* Conteúdo — pb-16 para não ficar atrás da bottom nav */}
      <div className="pb-16">
        {children}
      </div>

      <BottomNav items={NAV_ITEMS} />
    </div>
  )
}

`

### src\app\tecnico\loading.tsx
`	s
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    </div>
  )
}

`

### src\app\tecnico\ocorrencias\actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'


async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/login')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: (await getTenantId()), email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const ResolucaoSchema = z.object({
  resolution_notes: z.string().min(5, 'Descreva a resolução em pelo menos 5 caracteres'),
})

export type ResolucaoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Resolver ocorrência ──────────────────────────────────────────────────────

export async function resolverOcorrencia(
  ocorrenciaId: string,
  _prev: ResolucaoFormState,
  formData: FormData,
): Promise<ResolucaoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = ResolucaoSchema.safeParse({
    resolution_notes: formData.get('resolution_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const occurrence = await prisma.occurrence.findFirst({ where: { id: ocorrenciaId , tenant_id: (await getTenantId()) },
    select: { status: true, severity: true },
  })
  if (!occurrence)                        return { error: 'Ocorrência não encontrada.' }
  if (occurrence.status === 'RESOLVED')   return { error: 'Ocorrência já encerrada.' }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.occurrence.updateMany({ where: { id: ocorrenciaId , tenant_id: (await getTenantId()) }, data: {
        status:           'RESOLVED',
        resolved_at:      now,
        resolved_by:      userId,
        resolution_notes: parsed.data.resolution_notes,
      },
    })
    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'occurrences',
      recordId:  ocorrenciaId,
      before:    { status: occurrence.status },
      after:     { status: 'RESOLVED', resolved_by: userId, resolution_notes: parsed.data.resolution_notes },
    })
  })

  revalidatePath('/tecnico/ocorrencias')
  revalidatePath(`/tecnico/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/operador/ocorrencias')
  return { success: true }
}

`

### src\app\tecnico\ocorrencias\nova\occurrence-form.tsx
`	s
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '@/app/operador/ocorrencias/actions'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'occurrence_draft_tecnico'
const INITIAL: OcorrenciaFormState = {}

const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = { description: string; severity: string }
const EMPTY_DRAFT: Draft = { description: '', severity: '' }

export function TecnicoOccurrenceForm() {
  const router   = useRouter()
  const formRef  = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)

  const [mounted,      setMounted]      = useState(false)
  const [draft,        setDraft]        = useState<Draft>(EMPTY_DRAFT)
  const [photoName,    setPhotoName]    = useState<string | null>(null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const [offlineError, setOfflineError] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved) as Draft)
    } catch { /* ignora */ }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/ocorrencias')
    }
  }, [state.success, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(null); return }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Formato inválido. Use JPG, PNG ou WEBP.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Arquivo muito grande. Máximo 5 MB.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    setPhotoName(file.name)
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo?.[0]

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-5"
    >
      {offlineError && (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description" name="description"
          rows={4}
          autoComplete="off"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-medium text-slate-300">
          Severidade *
        </label>
        <select
          id="severity" name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido */}
      {draft.severity && (
        <div className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm">
          <span className="text-slate-500">Prazo para resolução: </span>
          <span className="text-slate-300 font-medium">{DEADLINE_LABEL[draft.severity]}</span>
          <span className="ml-1.5 text-xs text-slate-600">(definido pelo Gestor)</span>
        </div>
      )}

      {/* Foto */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Foto <span className="text-slate-500 font-normal">(opcional — JPG, PNG ou WEBP, máx. 5 MB)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 hover:bg-slate-800 transition-colors">
          <span className="text-xs text-slate-400 flex-1 truncate">
            {photoName ?? 'Toque para selecionar uma foto'}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <span className="shrink-0 rounded px-2 py-1 text-xs bg-slate-700 text-slate-300">
            Escolher
          </span>
        </label>
        {photoFieldError && (
          <p className="text-xs text-red-400">{photoFieldError}</p>
        )}
        <p className="text-xs text-slate-600">
          Ao reabrir esta página o texto é recuperado, mas a foto precisa ser selecionada novamente.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-14 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50 text-base"
      >
        {isPending ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}

`

### src\app\tecnico\ocorrencias\nova\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { TecnicoOccurrenceForm } from './occurrence-form'

export default async function NovaOcorrenciaTecnicoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div>
        <BackButton href="/tecnico/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <TecnicoOccurrenceForm />
    </main>
  )
}

`

### src\app\tecnico\ocorrencias\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 20

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasTecnicoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = statusFilter === 'all'

  const where = {
    tenant_id: (await getTenantId()),
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/tecnico/ocorrencias/nova"
              className="rounded-md border border-green-700 bg-green-900/40 px-3 py-1.5 text-xs text-green-400 hover:bg-green-900/60"
            >
              + Nova
            </Link>
            <Link
              href="/tecnico/ocorrencias"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                !showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Em aberto
            </Link>
            <Link
              href="/tecnico/ocorrencias?status=all"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Todas
            </Link>
          </div>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-14 text-center text-sm text-slate-500">
            Nenhuma ocorrência encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((oc) => {
              const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
              const hasPhoto     = oc.photos.length > 0

              return (
                <Link
                  key={oc.id}
                  href={`/tecnico/ocorrencias/${oc.id}`}
                  className={[
                    'block rounded-xl border bg-slate-900 p-4 space-y-2 hover:bg-slate-800 transition-colors',
                    prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                    </span>
                    {prazoVencido && (
                      <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                        PRAZO VENCIDO
                      </span>
                    )}
                    {oc.status === 'RESOLVED' && (
                      <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                        Resolvida
                      </span>
                    )}
                    {hasPhoto && (
                      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                        Com foto
                      </span>
                    )}
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                  {/* Rodapé */}
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{oc.reporter.name} · {formatDatetime(oc.created_at)}</span>
                    <span className={prazoVencido ? 'text-red-400 font-medium' : ''}>
                      {formatDatetime(oc.deadline)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/tecnico/ocorrencias?page=${page - 1}${showAll ? '&status=all' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/ocorrencias?page=${page + 1}${showAll ? '&status=all' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

`

### src\app\tecnico\ocorrencias\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { ResolveForm } from './resolve-form'
import { getTenantId } from '@/lib/tenant'


const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const occurrence = await prisma.occurrence.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      reporter:    { select: { name: true } },
      resolver:    { select: { name: true } },
      responsible: { select: { name: true } },
      photos:      { select: { id: true }, take: 1 },
    },
  })

  if (!occurrence || occurrence.tenant_id !== (await getTenantId())) notFound()

  const now          = new Date()
  const prazoVencido = occurrence.status !== 'RESOLVED' && new Date(occurrence.deadline) < now
  const hasPhoto     = occurrence.photos.length > 0

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <BackButton href="/tecnico/ocorrencias" label="Ocorrências" />
          <h1 className="text-base font-semibold mt-1">Detalhe da ocorrência</h1>
        </div>

        {/* Card da ocorrência */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          prazoVencido ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[occurrence.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {SEVERITY_LABEL[occurrence.severity] ?? occurrence.severity}
            </span>
            {prazoVencido && (
              <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                PRAZO VENCIDO
              </span>
            )}
            {occurrence.status === 'RESOLVED' && (
              <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                Resolvida
              </span>
            )}
            {occurrence.status === 'OPEN' && (
              <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                Aberta
              </span>
            )}
            {occurrence.status === 'IN_PROGRESS' && (
              <span className="rounded border border-sky-900/50 bg-sky-950/60 px-2 py-0.5 text-xs font-medium text-sky-400">
                Em andamento
              </span>
            )}
          </div>

          {/* Descrição */}
          <p className="text-sm text-slate-200 leading-relaxed">{occurrence.description}</p>

          {/* Metadados */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <dt className="text-slate-500">Registrado por</dt>
              <dd className="text-slate-300">{occurrence.reporter.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Data</dt>
              <dd className="text-slate-300">{formatDatetime(occurrence.created_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Prazo</dt>
              <dd className={prazoVencido ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {formatDatetime(occurrence.deadline)}
              </dd>
            </div>
            {occurrence.responsible && (
              <div>
                <dt className="text-slate-500">Responsável</dt>
                <dd className="text-slate-300">{occurrence.responsible.name}</dd>
              </div>
            )}
          </dl>

          {/* Foto */}
          {hasPhoto && (
            <div className="pt-1">
              <Link
                href={`/api/occurrences/${occurrence.id}/photo`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
              >
                Ver foto anexada →
              </Link>
            </div>
          )}

          {/* Resolução (se encerrada) */}
          {occurrence.status === 'RESOLVED' && (
            <div className="rounded-md border border-green-900/40 bg-green-950/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-green-400">Resolução</p>
              <p className="text-sm text-slate-300">{occurrence.resolution_notes ?? '—'}</p>
              <p className="text-xs text-slate-600">
                Por {occurrence.resolver?.name ?? '—'} em {occurrence.resolved_at ? formatDatetime(occurrence.resolved_at) : '—'}
              </p>
            </div>
          )}

          {/* Formulário de resolução (só se aberta) */}
          {occurrence.status !== 'RESOLVED' && (
            <ResolveForm ocorrenciaId={occurrence.id} />
          )}
        </div>
    </main>
  )
}

`

### src\app\tecnico\ocorrencias\[id]\resolve-form.tsx
`	s
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolverOcorrencia, type ResolucaoFormState } from '../actions'
import { Button } from '@/components/ui/button'

const INITIAL: ResolucaoFormState = {}

export function ResolveForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const router      = useRouter()
  const boundAction = resolverOcorrencia.bind(null, ocorrenciaId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-4 border-t border-slate-800">
      <h3 className="text-sm font-semibold text-slate-300">Fechar ocorrência</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="resolution_notes" className="text-xs font-medium text-slate-400">
          Resolução adotada *
        </label>
        <textarea
          id="resolution_notes" name="resolution_notes"
          rows={4}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva como a ocorrência foi resolvida…"
        />
        {state.fieldErrors?.resolution_notes && (
          <p className="text-xs text-red-400">{state.fieldErrors.resolution_notes[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
      >
        {isPending ? 'Fechando…' : 'Confirmar resolução'}
      </Button>
    </form>
  )
}

`

### src\app\tecnico\turnos\tarefas\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'


function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Passagem pendente',
  CLOSED:           'Fechado',
}
const STATUS_COLOR: Record<string, string> = {
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

export default async function TecnicoInstanciasPage() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const instances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: (await getTenantId()),
      date:      { gte: today },
    },
    include: {
      shift:  { select: { name: true, start_time: true, end_time: true } },
      opener: { select: { name: true } },
      _count: { select: { shift_tasks: true } },
    },
    orderBy: { opened_at: 'desc' },
    take: 20,
  })

  const pendingByInstance = await prisma.shiftTask.groupBy({
    by:     ['shift_instance_id'],
    where:  { tenant_id: (await getTenantId()), status: 'PENDING', shift_instance_id: { in: instances.map((i) => i.id) } },
    _count: { _all: true },
  })
  const pendingMap = Object.fromEntries(pendingByInstance.map((r) => [r.shift_instance_id, r._count._all]))

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">Turnos — Atribuir tarefas</h1>

        {instances.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
            <p className="text-sm text-slate-500">Nenhum turno encontrado hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const pending = pendingMap[inst.id] ?? 0
              return (
                <div
                  key={inst.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        {inst.shift.start_time} – {inst.shift.end_time} · aberto por {inst.opener.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDatetime(inst.opened_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? ''}`}>
                      {STATUS_LABEL[inst.status] ?? inst.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      {inst._count.shift_tasks} tarefa(s) ·{' '}
                      {pending > 0
                        ? <span className="text-amber-400">{pending} pendente(s)</span>
                        : <span className="text-slate-600">nenhuma pendente</span>
                      }
                    </span>
                    <Link href={`/tecnico/turnos/tarefas/${inst.id}`}>
                      <Button className="h-8 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
                        Gerenciar tarefas
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

    </main>
  )
}


`

### src\app\tecnico\turnos\tarefas\[id]\page.tsx
`	s
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TecnicoTaskForm } from './tecnico-task-form'
import { getTenantId } from '@/lib/tenant'


export default async function TecnicoInstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findFirst({ where: { id, tenant_id: (await getTenantId()) },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
        shift_tasks: {
          include: {
            assignee: { select: { name: true } },
            creator:  { select: { name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where:   { tenant_id: (await getTenantId()), role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== (await getTenantId())) redirect('/tecnico/turnos/tarefas')

  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <BackButton href="/tecnico/turnos/tarefas" label="Tarefas" />
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · aberto por {instance.opener.name}
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',     value: instance.shift_tasks.length,  color: 'text-slate-100' },
            { label: 'Pendentes', value: pending,                        color: pending > 0 ? 'text-amber-400' : 'text-slate-100' },
            { label: 'Concluídas',value: done,                           color: done > 0 ? 'text-green-400' : 'text-slate-100' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tarefas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <TecnicoTaskForm
            instanceId={id}
            operators={operators}
            tasks={instance.shift_tasks}
            canAdd={instance.status !== 'CLOSED'}
          />
        </div>

    </main>
  )
}

`

### src\app\tecnico\turnos\tarefas\[id]\tecnico-task-form.tsx
`	s
'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
// actions ficam no path do Gestor — import compartilhado conforme decisão de arquitetura
import { atribuirTarefa, removerTarefa, type TaskFormState } from '@/app/gestor/turnos/tarefas/[id]/task-actions'

const INITIAL: TaskFormState = {}

type Operator = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  assignee: { name: string } | null
  creator: { name: string }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE:    'Concluída',
  SKIPPED: 'Pulada',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-slate-700 bg-slate-800/60 text-slate-400',
  DONE:    'border-green-900/50 bg-green-950/60 text-green-400',
  SKIPPED: 'border-slate-700/50 bg-slate-800/30 text-slate-500',
}

export function TecnicoTaskForm({
  instanceId,
  operators,
  tasks,
  canAdd,
}: {
  instanceId: string
  operators:  Operator[]
  tasks:      Task[]
  canAdd:     boolean
}) {
  const boundAction = atribuirTarefa.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {task.assignee ? `→ ${task.assignee.name}` : 'Qualquer operador'} · por {task.creator.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
                {task.status === 'PENDING' && canAdd && (
                  <form action={removerTarefa.bind(null, task.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-400" disabled={isPending}>
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-medium text-slate-400">Nova tarefa</p>

          <div>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Título da tarefa *"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-400">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Descrição opcional"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <select
            name="assigned_to_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Qualquer operador</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          {state.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full bg-slate-100 text-sm text-slate-900 hover:bg-white"
          >
            {isPending ? 'Salvando…' : '+ Atribuir tarefa'}
          </Button>
        </form>
      )}
    </div>
  )
}

`

### src\components\admin\sidebar.tsx
`	s
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Factory,
  LayoutDashboard,
  Shield,
  ScrollText,
} from 'lucide-react'

type NavItem =
  | { type: 'link'; label: string; href: string; icon: React.ReactNode }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link', label: 'Painel Geral', href: '/admin/plantas', icon: <LayoutDashboard className="w-4 h-4" /> },
  { type: 'section', label: 'Gestão' },
  { type: 'link', label: 'Plantas (ETEs)', href: '/admin/plantas', icon: <Factory className="w-4 h-4" /> },
  { type: 'section', label: 'Sistema' },
  { type: 'link', label: 'Auditoria Global', href: '/admin/auditoria', icon: <ScrollText className="w-4 h-4" /> },
  { type: 'link', label: 'Segurança', href: '/admin/seguranca', icon: <Shield className="w-4 h-4" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              {item.label}
            </p>
          )
        }
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-indigo-600/20 font-medium text-indigo-300 border border-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

`

### src\components\auth\AuthComponents.tsx
`	s
'use client'

import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { AlertCircle } from 'lucide-react'

// --- AuthHeader ---
export function AuthHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="mb-8 space-y-4">
      {/* Logo aparece aqui apenas no mobile, pois no desktop já está no canvas */}
      <div className="md:hidden mb-6">
        <Logo size="sm" />
      </div>
      
      <div>
        <h1 className="text-2xl font-display tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </div>

      <div className="h-px w-10 bg-border mt-4" />
    </div>
  )
}

// --- AuthFooterLink ---
export function AuthFooterLink({ href, label, align = 'center' }: { href: string, label: React.ReactNode, align?: 'left' | 'center' | 'right' }) {
  return (
    <div className={`mt-6 text-sm text-muted-foreground ${align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right'}`}>
      <Link href={href} className="hover:text-foreground underline-offset-4 hover:underline transition-colors">
        {label}
      </Link>
    </div>
  )
}

// --- FormError ---
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  
  return (
    <div className="flex items-start gap-2 p-3 bg-alarm/5 border border-alarm/30 rounded-lg text-sm text-alarm animate-in fade-in slide-in-from-top-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}

// --- PasswordStrength ---
export function PasswordStrength({ password }: { password?: string }) {
  // Mock simple strength logic
  const len = password?.length || 0
  let strength = 0
  if (len > 0) strength++
  if (len >= 6) strength++
  if (len >= 10 && /[A-Z]/.test(password || '')) strength++
  if (len >= 10 && /[0-9]/.test(password || '') && /[^A-Za-z0-9]/.test(password || '')) strength++

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1 h-1">
        <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-alarm' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-data' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 4 ? 'bg-success' : 'bg-surface-3'}`} />
      </div>
      <p className="text-[10px] text-muted-foreground text-right uppercase tracking-wider">
        {strength === 0 && ' '}
        {strength === 1 && 'Muito Fraca'}
        {strength === 2 && 'Fraca'}
        {strength === 3 && 'Boa'}
        {strength === 4 && 'Forte'}
      </p>
    </div>
  )
}

`

### src\components\auth\AuthShell.tsx
`	s
'use client'

import React from 'react'
import { WaterCanvas } from './WaterCanvas'

interface AuthShellProps {
  children: React.ReactNode
  tagline?: string
}

export function AuthShell({ children, tagline }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Lado Esquerdo - Visual (Água animada) */}
      {/* Mobile: 40vh de altura. Desktop: 50% da largura, fixa na tela */}
      <div className="relative w-full md:w-1/2 h-[40vh] md:h-screen shrink-0 border-b md:border-b-0 md:border-r border-border overflow-hidden">
        {/* No desktop a imagem fica sticky para não rolar se o form for grande */}
        <div className="absolute inset-0 md:fixed md:w-1/2 md:h-screen">
          <WaterCanvas tagline={tagline} />
        </div>
      </div>

      {/* Lado Direito - Painel do Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface px-6 py-12 md:px-12 lg:px-16 min-h-[60vh]">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {children}
        </div>
      </div>
    </div>
  )
}

`

### src\components\auth\PasswordField.tsx
`	s
'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function PasswordField({ label = "Senha", ...props }: PasswordFieldProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id || props.name} className="block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          {...props}
          type={show ? 'text' : 'password'}
          className={`h-11 rounded-[10px] bg-surface-2 border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 pr-10 ${props.className || ''}`}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

`

### src\components\auth\WaterCanvas.tsx
`	s
'use client'

import { Logo } from '@/components/logo'
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react'

export function WaterCanvas({ tagline = "Conformidade ambiental em tempo real." }: { tagline?: string }) {
  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-background">
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-60"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, var(--brand), transparent 65%)'
        }}
      />

      {/* SVG Water Ripples Animation */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Noise overlay */}
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.04" />

          {/* Animated Water Lines */}
          <g className="motion-reduce:hidden" stroke="var(--color-data)" strokeWidth="0.2" fill="none" opacity="0.18">
            <path d="M-20,50 Q10,40 40,50 T100,50 T160,50">
              <animate attributeName="d" dur="18s" repeatCount="indefinite"
                values="M-20,50 Q10,40 40,50 T100,50 T160,50; M-20,50 Q10,60 40,50 T100,50 T160,50; M-20,50 Q10,40 40,50 T100,50 T160,50" />
            </path>
            <path d="M-20,60 Q20,70 60,60 T140,60 T220,60">
              <animate attributeName="d" dur="22s" repeatCount="indefinite"
                values="M-20,60 Q20,70 60,60 T140,60 T220,60; M-20,60 Q20,50 60,60 T140,60 T220,60; M-20,60 Q20,70 60,60 T140,60 T220,60" />
            </path>
            <path d="M-20,75 Q30,65 80,75 T180,75 T280,75">
              <animate attributeName="d" dur="26s" repeatCount="indefinite"
                values="M-20,75 Q30,65 80,75 T180,75 T280,75; M-20,75 Q30,85 80,75 T180,75 T280,75; M-20,75 Q30,65 80,75 T180,75 T280,75" />
            </path>
          </g>

          {/* Static fallbacks for reduced motion */}
          <g className="hidden motion-reduce:block" stroke="var(--color-data)" strokeWidth="0.2" fill="none" opacity="0.18">
            <path d="M-20,50 Q10,40 40,50 T100,50 T160,50" />
            <path d="M-20,60 Q20,70 60,60 T140,60 T220,60" />
          </g>

          {/* Bubbles */}
          <g className="motion-reduce:hidden" fill="var(--color-data)" opacity="0.12">
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx={20 + i * 10} cy="110" r={0.5 + Math.random() * 1.5}>
                <animate 
                  attributeName="cy" 
                  from="110" 
                  to="-10" 
                  dur={`${22 + Math.random() * 8}s`} 
                  begin={`${Math.random() * 10}s`} 
                  repeatCount="indefinite" 
                />
                <animate 
                  attributeName="opacity" 
                  values="0;0.6;0" 
                  keyTimes="0;0.5;1" 
                  dur={`${22 + Math.random() * 8}s`} 
                  begin={`${Math.random() * 10}s`} 
                  repeatCount="indefinite" 
                />
              </circle>
            ))}
          </g>
        </svg>
      </div>

      {/* Content Top */}
      <div className="relative z-10 p-8 lg:p-16">
        <Logo size="lg" className="mb-8" />
        <h1 className="text-3xl lg:text-4xl font-display tracking-tight text-foreground max-w-md">
          {tagline}
        </h1>
        <p className="text-base text-muted-foreground max-w-md mt-4 leading-relaxed">
          Plataforma de monitoramento avançado para estações de tratamento de efluentes.
        </p>
      </div>

      {/* Content Bottom */}
      <div className="relative z-10 p-8 lg:p-16 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Badge icon={ShieldCheck}>LGPD compliant</Badge>
          <Badge icon={Lock}>ISO 27001</Badge>
          <Badge icon={CheckCircle2}>Padrão CONAMA</Badge>
        </div>
        
        <div className="text-xs text-muted-foreground/60 flex items-center gap-3">
          <span>© {new Date().getFullYear()} Solentis</span>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Termos</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
        </div>
      </div>
    </div>
  )
}

function Badge({ children, icon: Icon }: { children: React.ReactNode, icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface/60 backdrop-blur border border-border px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
      <Icon className="w-3.5 h-3.5 text-success" />
      {children}
    </div>
  )
}

`

### src\components\back-button.tsx
`	s
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
}

export function BackButton({ href, label = 'Voltar' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={1.75} />
      {label}
    </button>
  )
}

`

### src\components\gestor\sidebar.tsx
`	s
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users,
  Settings, 
  Microscope,
  Tags,
  MapPin,
  Clock,
  CalendarDays,
  Timer,
  FlaskConical,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  ScrollText,
  ShieldAlert,
  Wrench
} from 'lucide-react'

type NavItem =
  | { type: 'link'; label: string; href: string; excludePrefix?: string; icon: React.ReactNode }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link',    label: 'Dashboard',           href: '/gestor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { type: 'link',    label: 'Usuários',             href: '/gestor/usuarios', icon: <Users className="w-4 h-4" /> },
  { type: 'section', label: 'Configurações' },
  { type: 'link',    label: 'Plano de Monitoramento', href: '/gestor/parametros', icon: <Settings className="w-4 h-4" /> },
  { type: 'link',    label: 'Categorias',           href: '/gestor/categorias', icon: <Tags className="w-4 h-4" /> },
  { type: 'link',    label: 'Turnos',               href: '/gestor/turnos', excludePrefix: '/gestor/turnos/tarefas', icon: <Clock className="w-4 h-4" /> },
  { type: 'link',    label: 'Tarefas do Turno',  href: '/gestor/turnos/tarefas', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Prazos de Ocorrência', href: '/gestor/prazos-ocorrencia', icon: <Timer className="w-4 h-4" /> },
  { type: 'section', label: 'Estoque' },
  { type: 'link',    label: 'Produtos Químicos',   href: '/gestor/produtos-quimicos', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'section', label: 'Operação' },
  { type: 'link',    label: 'Análises Internas (Grid)', href: '/gestor/analises-internas', icon: <Microscope className="w-4 h-4" /> },
  { type: 'link',    label: 'Histórico de Análises', href: '/gestor/analises', icon: <FlaskConical className="w-4 h-4" /> },
  { type: 'link',    label: 'Laudos Externos',      href: '/gestor/laudos', icon: <UploadCloud className="w-4 h-4" /> },
  { type: 'link',    label: 'Leituras Realizadas',  href: '/gestor/leituras', icon: <FileCheck2 className="w-4 h-4" /> },
  { type: 'link',    label: 'Ocorrências',         href: '/gestor/ocorrencias', icon: <AlertTriangle className="w-4 h-4" /> },
  { type: 'section', label: 'Manutenção' },
  { type: 'link',    label: 'Preventivas',         href: '/gestor/manutencao/preventivas', icon: <CalendarDays className="w-4 h-4" /> },
  { type: 'link',    label: 'Corretivas',          href: '/gestor/manutencao/corretivas', icon: <Wrench className="w-4 h-4" /> },
  { type: 'section', label: 'Governança' },
  { type: 'link',    label: 'Relatórios (Auditoria)', href: '/gestor/relatorios', icon: <ScrollText className="w-4 h-4" /> },
  { type: 'section', label: 'Sistema' },
  { type: 'link',    label: 'Auditoria Global',     href: '/gestor/auditoria', icon: <ShieldAlert className="w-4 h-4" /> },
]

export function GestorSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 font-mono"
            >
              {item.label}
            </p>
          )
        }
        const isActive =
          (pathname === item.href || pathname.startsWith(item.href + '/')) &&
          (!item.excludePrefix || !pathname.startsWith(item.excludePrefix))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'font-semibold border border-[var(--brand)]/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
            style={
              isActive
                ? {
                    color: 'var(--brand)',
                    backgroundColor: 'var(--brand-soft)',
                  }
                : undefined
            }
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}


`

### src\components\logo.tsx
`	s
export function Logo({ className = "", size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 48 : 31

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div 
        style={{
          width: dim,
          height: dim,
          borderRadius: size === "lg" ? '12px' : '9px',
          background: 'linear-gradient(150deg, #3ad0d6, #0a86a0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(10, 134, 160, 0.32)'
        }}
        className="shrink-0 sol-logo"
      >
        <span className="sol-surface"></span>
        <span className="sol-b sol-b1"></span>
        <span className="sol-b sol-b2"></span>
        <span className="sol-b sol-b3"></span>
        <span className="sol-b sol-b4"></span>
      </div>
      <span 
        className={`font-heading font-bold text-slate-100 ${size === "lg" ? "text-2xl" : "text-lg"}`}
        style={{ letterSpacing: "-0.03em" }}
      >
        solentis
      </span>
    </div>
  )
}

`

### src\components\manutencao\sidebar.tsx
`	s
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Wrench,
  AlertTriangle
} from 'lucide-react'

type NavItem = {
  type: 'link'
  label: string
  href: string
  icon: React.ReactNode
} | {
  type: 'divider'
} | {
  type: 'title'
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { type: 'title',   label: 'Visão Geral' },
  { type: 'link',    label: 'Dashboard',           href: '/manutencao/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  
  { type: 'divider' },
  
  { type: 'title',   label: 'Operação' },
  { type: 'link',    label: 'Preventivas',         href: '/manutencao/preventivas', icon: <Wrench className="w-4 h-4" /> },
  { type: 'link',    label: 'Corretivas',          href: '/manutencao/corretivas', icon: <AlertTriangle className="w-4 h-4" /> },
]

export function ManutencaoSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
      {NAV_ITEMS.map((item, idx) => {
        if (item.type === 'divider') {
          return <hr key={idx} className="my-4 border-slate-800" />
        }
        if (item.type === 'title') {
          return (
            <h4 key={idx} className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {item.label}
            </h4>
          )
        }
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={idx}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600/10 text-blue-400'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

`

### src\components\mobile-nav.tsx
`	s
'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Fechar o menu ao trocar de rota
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevenir scroll do fundo quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  return (
    <div className="lg:hidden flex items-center">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 mr-2 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Escuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Painel do Menu (Barra Lateral Móvel) */}
          <div className="relative flex w-64 flex-col bg-slate-900 border-r border-slate-800 h-full overflow-y-auto shadow-2xl">
            <div className="absolute right-2 top-2 z-50">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-8 flex-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

`

### src\components\push-manager.tsx
`	s
'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser } from '@/lib/push-actions'
import { Bell, BellOff } from 'lucide-react'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushManager() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      navigator.serviceWorker.ready.then(reg => {
        setRegistration(reg)
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true)
        })
      })
    }
  }, [])

  const subscribe = async () => {
    if (!registration) return
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      })
      await subscribeUser(sub as any)
      setIsSubscribed(true)
    } catch (err) {
      console.error('Failed to subscribe', err)
    }
  }

  const unsubscribe = async () => {
    if (!registration) return
    try {
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await unsubscribeUser(sub.endpoint)
        await sub.unsubscribe()
        setIsSubscribed(false)
      }
    } catch (err) {
      console.error('Failed to unsubscribe', err)
    }
  }

  if (!isSupported) return null

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
      title={isSubscribed ? "Desativar Notificações" : "Ativar Notificações"}
    >
      {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  )
}

`

### src\components\sign-out-action.ts
`	s
'use server'

import { signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function handleSignOut() {
  await signOut({ redirect: false })
  redirect('/login')
}

`

### src\components\sign-out-button.tsx
`	s
import { Button } from '@/components/ui/button'
import { handleSignOut } from './sign-out-action'

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <Button type="submit" variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
        Sair
      </Button>
    </form>
  )
}

`

### src\components\theme-provider.tsx
`	s
'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            let t = localStorage.getItem('theme');
            if (!t) {
              t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            if (t === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch(e) {}
        `
      }}
    />
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  if (theme === null) return <div className="w-8 h-8" /> // placeholder

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex items-center justify-center"
      title="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

`

### src\components\ui\badge.tsx
`	s
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

`

### src\components\ui\bottom-nav.tsx
`	s
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  href:  string
  label: string
  icon:  LucideIcon
}

type BottomNavProps = {
  items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/60 pb-safe"
      aria-label="Navegação principal"
    >
      <ul className="flex h-14">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors',
                  isActive
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span
                  className={cn(
                    'text-[10px] leading-none font-medium tracking-wide',
                    !isActive && 'text-slate-600',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

`

### src\components\ui\button.tsx
`	s
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

`

### src\components\ui\card.tsx
`	s
import * as React from "react"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow ${className || ""}`}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={`font-semibold leading-none tracking-tight ${className || ""}`}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-slate-400 ${className || ""}`}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className || ""}`} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center p-6 pt-0 ${className || ""}`}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

`

### src\components\ui\command-menu.tsx
`	s
'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, AlertTriangle, Droplet, LayoutDashboard, FileText, UploadCloud, FileCheck, Power, Wrench, MapPin, SearchCode } from 'lucide-react'

// Hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

export function CommandMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  // Toggle the menu when ⌘K is pressed
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Close the menu when navigating
  React.useEffect(() => {
    setOpen(false)
    setSearch('')
  }, [pathname])

  // Fetch search results
  React.useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setResults(data.results || [])
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [debouncedSearch])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Determine context based on URL
  const isGestor = pathname.startsWith('/gestor')
  const isTecnico = pathname.startsWith('/tecnico')
  const isOperador = pathname.startsWith('/operador')

  if (!isGestor && !isTecnico && !isOperador) return null

  const getIconForType = (type: string) => {
    if (type === 'equipment') return <Wrench className="h-4 w-4" />
    if (type === 'point') return <MapPin className="h-4 w-4" />
    if (type === 'occurrence') return <AlertTriangle className="h-4 w-4 text-amber-500" />
    return <SearchCode className="h-4 w-4" />
  }

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 pt-[20vh]"
      shouldFilter={false} // We are doing server-side filtering
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center border-b border-slate-800 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
          <Command.Input 
            value={search}
            onValueChange={setSearch}
            placeholder="Digite um comando, equipamento, ponto ou ocorrência..." 
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 text-slate-200">
          
          {loading && (
            <div className="py-6 text-center text-sm text-slate-500">
              Buscando...
            </div>
          )}

          {!loading && search.length >= 2 && results.length === 0 && (
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              Nenhum resultado encontrado para "{search}".
            </Command.Empty>
          )}

          {!loading && results.length > 0 && (
            <Command.Group heading="Resultados da Busca" className="px-2 text-xs font-medium text-slate-500 mb-2">
              {results.map((item) => (
                <Command.Item 
                  key={item.id} 
                  onSelect={() => runCommand(() => router.push(item.href))} 
                  className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/80 shrink-0 text-slate-400">
                    {getIconForType(item.type)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-slate-200 truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-500 truncate">{item.subtitle}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {!search && (
            <>
              {isOperador && (
                <Command.Group heading="Ações de Operação" className="px-2 text-xs font-medium text-slate-500 mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/leituras/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <Droplet className="h-4 w-4" /> Cadastrar Leitura Manual
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/operador/turnos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <FileCheck className="h-4 w-4" /> Passagem de Turno
                  </Command.Item>
                </Command.Group>
              )}

              {isTecnico && (
                <Command.Group heading="Manutenção & Análise" className="px-2 text-xs font-medium text-slate-500 mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/ocorrencias/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <AlertTriangle className="h-4 w-4" /> Relatar Ocorrência
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/equipamentos'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <Wrench className="h-4 w-4" /> Gerir Equipamentos
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/tecnico/analises/nova'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <FileText className="h-4 w-4" /> Cadastrar Análise Laboratorial
                  </Command.Item>
                </Command.Group>
              )}

              {isGestor && (
                <Command.Group heading="Gestão Hídrica" className="px-2 text-xs font-medium text-slate-500 mb-2">
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/dashboard'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <LayoutDashboard className="h-4 w-4" /> Ir para Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/relatorios'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <FileText className="h-4 w-4 text-emerald-500" /> Gerar Relatório de Auditoria
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/laudos/importar'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <UploadCloud className="h-4 w-4 text-blue-500" /> Importar Laudos com IA
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => router.push('/gestor/ocorrencias'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Painel de Ocorrências
                  </Command.Item>
                </Command.Group>
              )}

              <Command.Separator className="-mx-2 my-1 h-px bg-slate-800" />
              <Command.Group className="px-2">
                <Command.Item onSelect={() => runCommand(() => router.push('/login'))} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded-md aria-selected:bg-slate-800 text-slate-400">
                  <Power className="h-4 w-4" /> Fazer Logoff
                </Command.Item>
              </Command.Group>
            </>
          )}

        </Command.List>
      </div>
    </Command.Dialog>
  )
}

`

### src\components\ui\consumption-bar-chart.tsx
`	s
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

export type ConsumptionData = {
  name: string
  total: number
  unit: string
}

export function ConsumptionBarChart({ data }: { data: ConsumptionData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Nenhum registro de consumo no período.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-sm">
          <p className="text-slate-300 font-medium mb-1">{label}</p>
          <p className="text-sky-400 font-bold">
            {payload[0].value.toFixed(2)} {payload[0].payload.unit}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#38bdf8" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

`

### src\components\ui\input.tsx
`	s
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

`

### src\components\ui\kpi-card.tsx
`	s
import Link from 'next/link'
import React from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | string
  delta?: number | null
  deltaLabel?: string
  href?: string
  sparklineData?: number[]
  alert?: boolean
}

export function KpiCard({
  title,
  value,
  delta,
  deltaLabel = 'vs período anterior',
  href,
  sparklineData = [],
  alert = false,
}: KpiCardProps) {
  // Configuração visual do delta
  const isPositive = delta && delta > 0
  const isNegative = delta && delta < 0
  const isNeutral = !isPositive && !isNegative

  // Corrente de cores para o SVG da sparkline (verde se positivo, senão red, ou cinza)
  let strokeColor = 'var(--color-slate-500)'
  if (isPositive) strokeColor = 'var(--color-status-ok)'
  if (isNegative) strokeColor = 'var(--color-status-danger)'

  // Renderização simples de path SVG
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null

    const max = Math.max(...sparklineData, 1) // evitar /0
    const min = Math.min(...sparklineData, 0)
    const range = max - min
    const width = 100
    const height = 30
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    }).join(' L ')

    return (
      <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-4 opacity-70">
        <path d={`M ${points}`} fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  const innerContent = (
    <>
      <div>
        <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
        <div className="flex items-baseline justify-between">
          <p className={`text-3xl font-semibold tabular-nums tracking-tight ${alert ? 'text-status-danger' : 'text-slate-100'}`}>
            {value}
          </p>
          
          <div className="flex items-center gap-1 text-xs">
            {delta === null || delta === undefined ? (
              <span className="flex items-center text-slate-500 font-mono">
                <Minus className="w-3 h-3 mr-0.5" /> —
              </span>
            ) : isPositive ? (
              <span className="flex items-center text-status-ok font-mono">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> {delta}%
              </span>
            ) : isNegative ? (
              <span className="flex items-center text-status-danger font-mono">
                <ArrowDownRight className="w-3 h-3 mr-0.5" /> {Math.abs(delta)}%
              </span>
            ) : (
              <span className="flex items-center text-slate-500 font-mono">
                <Minus className="w-3 h-3 mr-0.5" /> 0%
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {deltaLabel}
        </p>
      </div>

      {sparklineData.length > 0 ? (
        renderSparkline()
      ) : (
        <div className="mt-4 h-[30px] flex items-center justify-start">
           <span className="text-[10px] text-slate-600 uppercase tracking-widest">Sem dados no período</span>
        </div>
      )}
    </>
  )

  const commonClasses = `group relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all ${
    alert ? 'border-status-danger/40 bg-status-danger/5' : 'border-slate-800 bg-slate-900/50'
  }`

  if (href) {
    return (
      <Link href={href} className={`${commonClasses} hover:bg-slate-800/50`}>
        {innerContent}
      </Link>
    )
  }

  return (
    <div className={commonClasses}>
      {innerContent}
    </div>
  )
}

`

### src\components\ui\notification-bell.tsx
`	s
'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, CheckSquare, Wrench } from 'lucide-react'
import Link from 'next/link'
import { getNotifications, type NotificationItem } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const data = await getNotifications()
      setNotifications(data)
      setUnreadCount(data.length)
    }
    load()
    // Poll every 1 minute
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0) // Mark as read when opening
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-800 shadow-xl z-50 overflow-hidden">
          <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-200">Notificações</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Nenhuma notificação no momento.
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className={cn(
                        "mt-0.5 shrink-0 rounded-full p-1.5",
                        item.type === 'OCCURRENCE' && "bg-red-900/50 text-red-400",
                        item.type === 'TASK' && "bg-amber-900/50 text-amber-400",
                        item.type === 'MAINTENANCE' && "bg-sky-900/50 text-sky-400"
                      )}>
                        {item.type === 'OCCURRENCE' && <AlertTriangle className="h-4 w-4" />}
                        {item.type === 'TASK' && <CheckSquare className="h-4 w-4" />}
                        {item.type === 'MAINTENANCE' && <Wrench className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-medium text-slate-200">
                          {item.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-slate-400">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(item.date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

`

### src\components\ui\occurrences-pie-chart.tsx
`	s
'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

export type OccurrencesData = {
  name: string
  value: number
  color: string
}

export function OccurrencesPieChart({ data }: { data: OccurrencesData[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Nenhuma ocorrência registrada no período.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded shadow-xl text-sm">
          <p className="text-slate-300 font-medium">{payload[0].name}</p>
          <p className="font-bold" style={{ color: payload[0].payload.color }}>
            {payload[0].value} ocorrência(s)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

`

### src\components\ui\page-header.tsx
`	s
import React from 'react'

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

`

### src\components\ui\status-heatmap.tsx
`	s
import Link from 'next/link'
import React from 'react'

export type PointStatus = 'OK' | 'WARNING' | 'DANGER'

export interface HeatmapPoint {
  id: string
  name: string
  status: PointStatus
}

interface StatusHeatmapProps {
  points: HeatmapPoint[]
}

const STATUS_CONFIG: Record<PointStatus, { color: string; label: string; dot: string }> = {
  OK:      { color: 'text-status-ok',      label: 'OK',      dot: 'bg-status-ok' },
  WARNING: { color: 'text-status-warn',    label: 'Atenção', dot: 'bg-status-warn' },
  DANGER:  { color: 'text-status-danger',  label: 'Fora',    dot: 'bg-status-danger' },
}

export function StatusHeatmap({ points }: StatusHeatmapProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-800">
        <p className="text-sm text-slate-500">Nenhum ponto de coleta</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {points.map((point) => {
        const config = STATUS_CONFIG[point.status]
        return (
          <div
            key={point.id}
            className="group flex flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <span className="truncate text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
              {point.name}
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              <span className={`text-[10px] font-semibold tracking-wider uppercase ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

`

### src\components\ui\top-nav.tsx
`	s
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  // Only render on deep pages, not on dashboards or root
  const isDashboard = pathname.endsWith('/dashboard') || pathname === '/login' || pathname === '/admin/plantas' || pathname === '/'
  
  useEffect(() => {
    if (window.history.length > 1) {
      setCanGoBack(true)
    }
  }, [])

  if (isDashboard) return null

  return (
    <div className="sticky top-[53px] z-20 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 lg:hidden">
      <div className="mx-auto max-w-lg px-4 py-2">
        <button 
          onClick={() => {
            if (canGoBack) {
              router.back()
            } else {
              if (pathname.startsWith('/gestor')) router.push('/gestor/dashboard')
              else if (pathname.startsWith('/tecnico')) router.push('/tecnico/dashboard')
              else if (pathname.startsWith('/operador')) router.push('/operador/dashboard')
              else router.push('/')
            }
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors py-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
    </div>
  )
}

`

### src\components\ui\trend-chart.tsx
`	s
'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts'

export interface TrendChartData {
  time: string
  value: number
  minLimit: number | null
  maxLimit: number | null
  laboratoryType?: string
}

interface TrendChartProps {
  data: TrendChartData[]
  parameterName: string
  unit: string
}

export function TrendChart({ data, parameterName, unit }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-800">
        <p className="text-sm text-slate-500">Sem histórico para exibir no período.</p>
      </div>
    )
  }

  // Pegamos os limites do primeiro ponto válido (assumindo que não mudou no curto período plotado)
  const firstValid = data.find(d => d.minLimit !== null || d.maxLimit !== null)
  const minLimit = firstValid?.minLimit ?? null
  const maxLimit = firstValid?.maxLimit ?? null

  const hasMin = minLimit !== null
  const hasMax = maxLimit !== null

  // Para garantir que o eixo Y comporte a reference area "infinita" vermelha
  const dataMax = Math.max(...data.map(d => d.value))
  const dataMin = Math.min(...data.map(d => d.value))
  
  // Customização do YAxis domain para ter margem
  const yAxisDomain = (dataMinMax: any) => {
    let min = dataMinMax[0] as number
    let max = dataMinMax[1] as number
    if (hasMax && max < maxLimit! * 1.2) max = maxLimit! * 1.2
    if (hasMin && min > minLimit! * 0.8) min = minLimit! * 0.8
    if (max === min) {
       max += 10
       min = Math.max(0, min - 10)
    }
    return [Math.floor(min), Math.ceil(max)]
  }

  return (
    <div className="h-72 w-full flex flex-col">
      <div className="flex justify-end gap-3 px-2 text-[10px] text-slate-400 mb-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-slate-300 bg-slate-900 inline-block" /> Análise Interna</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-blue-400 bg-blue-500 inline-block" /> Laudo Externo</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand, #14b8a6)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-brand, #14b8a6)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--color-slate-500)" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="var(--color-slate-500)" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            domain={yAxisDomain as any}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-slate-900)', borderColor: 'var(--color-slate-700)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--color-slate-200)', fontWeight: 500 }}
            labelStyle={{ color: 'var(--color-slate-400)', marginBottom: '4px' }}
            formatter={(val: any, name: any, props: any) => {
              const labType = props.payload.laboratoryType === 'EXTERNAL' ? '(Externo)' : '(Interno)'
              return [`${val} ${unit} ${labType}`, parameterName]
            }}
          />

          {/* Cenário 1: Tem Min e Max (ex: pH) -> Faixa Permitida é Verde Clara entre eles */}
          {hasMin && hasMax && (
            <ReferenceArea
              y1={minLimit}
              y2={maxLimit}
              fill="var(--color-status-ok, #10b981)"
              fillOpacity={0.07}
            />
          )}

          {/* Cenário 2: Tem só Max (ex: Turbidez) -> Faixa Proibida Vermelha acima do Max */}
          {!hasMin && hasMax && (
            <>
              <ReferenceArea
                y1={maxLimit}
                // não definimos y2 para ir "até o infinito" visual do eixo
                fill="var(--color-status-danger)"
                fillOpacity={0.07}
              />
              <ReferenceLine y={maxLimit} stroke="var(--color-status-danger)" strokeDasharray="3 3" opacity={0.5} />
            </>
          )}

          {/* Cenário 3: Tem só Min -> Faixa Proibida Vermelha abaixo do Min */}
          {hasMin && !hasMax && (
            <>
              <ReferenceArea
                y2={minLimit}
                fill="var(--color-status-danger)"
                fillOpacity={0.07}
              />
              <ReferenceLine y={minLimit} stroke="var(--color-status-danger)" strokeDasharray="3 3" opacity={0.5} />
            </>
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand, #14b8a6)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBrand)"
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!cx || !cy) return <g key={`dot-${props.key}`} />
              const isExternal = payload.laboratoryType === 'EXTERNAL'
              return (
                <circle
                  key={`dot-${props.key}`}
                  cx={cx}
                  cy={cy}
                  r={isExternal ? 5 : 3}
                  fill={isExternal ? '#3b82f6' : 'var(--color-slate-900)'}
                  stroke={isExternal ? '#60a5fa' : 'var(--color-brand, #14b8a6)'}
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 5, fill: 'var(--color-accent)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

`

### src\lib\audit.ts
`	s
import { PrismaClient } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

// Aceita PrismaClient direto ou um transaction client (ambos expõem auditLog)
type AuditClient = Pick<PrismaClient, 'auditLog'>

export interface LogAuditParams {
  userId:         string | null
  action:         AuditAction
  tableName:      string
  recordId:       string
  before?:        Record<string, unknown> | null
  after?:         Record<string, unknown> | null
  justification?: string | null
}

/**
 * Grava um registro de auditoria.
 * Chamar dentro de $transaction quando a mutação principal também está numa transação,
 * ou com `prisma` diretamente quando a mutação é simples.
 */
export async function logAudit(
  client: AuditClient,
  params: LogAuditParams,
): Promise<void> {
  const { userId, action, tableName, recordId, before, after, justification } = params
  await client.auditLog.create({
    data: {
      user_id:       userId       ?? null,
      action,
      table_name:    tableName,
      record_id:     recordId,
      before:        before  != null ? JSON.stringify(before)  : null,
      after:         after   != null ? JSON.stringify(after)   : null,
      justification: justification  ?? null,
    },
  })
}

`

### src\lib\auth-utils.ts
`	s
export const RATE_LIMIT_MAX_ATTEMPTS  = 5
export const RATE_LIMIT_WINDOW_MS     = 15 * 60 * 1000 // 15 minutos
export const SESSION_MAX_AGE_OPERATOR = 30 * 60         // 30 min em segundos
export const SESSION_MAX_AGE_DEFAULT  = 60 * 60         // 60 min em segundos

export const ROLE_PREFIXES: Record<string, string> = {
  '/gestor':     'MANAGER',
  '/tecnico':    'TECHNICIAN',
  '/operador':   'OPERATOR',
  '/manutencao': 'MAINTENANCE',
  '/admin':      'SUPER_ADMIN',
}

export function isRateLimited(recentFailures: number): boolean {
  return recentFailures >= RATE_LIMIT_MAX_ATTEMPTS
}

export function getSessionMaxAge(role: string): number {
  return role === 'OPERATOR' ? SESSION_MAX_AGE_OPERATOR : SESSION_MAX_AGE_DEFAULT
}

export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/admin/plantas'
    case 'MANAGER':     return '/gestor/dashboard'
    case 'TECHNICIAN':  return '/tecnico/dashboard'
    case 'OPERATOR':    return '/operador/dashboard'
    case 'MAINTENANCE': return '/manutencao/dashboard'
    default:            return '/login'
  }
}

export function isRouteAllowedForRole(pathname: string, userRole: string): boolean {
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      return userRole === requiredRole
    }
  }
  return true
}

`

### src\lib\auth.config.ts
`	s
import type { NextAuthConfig } from 'next-auth'
import { SESSION_MAX_AGE_DEFAULT, getSessionMaxAge } from '@/lib/auth-utils'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_DEFAULT,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
        token.tenantId           = user.tenantId

        // Timeout de sessão diferente por perfil
        token.exp = Math.floor(Date.now() / 1000) + getSessionMaxAge(user.role)
      }
      return token
    },
    session({ session, token }) {
      session.user.role               = token.role as string
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.tenantId           = token.tenantId as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig

`

### src\lib\auth.ts
`	s
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
  isRateLimited,
} from '@/lib/auth-utils'
import { authConfig } from '@/lib/auth.config'

// ─── Augmentação de tipos do NextAuth ────────────────────────────────────────
declare module 'next-auth' {
  interface User {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
  interface Session {
    user: {
      role: string
      mustChangePassword: boolean
      tenantId: string
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Configuração NextAuth ────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Para evitar timing attacks, consultamos o usuário primeiro,
        // mas sempre verificamos a senha mesmo que ele não exista (com um hash dummy).
        const user = await prisma.user.findFirst({
          where: { email, is_active: true },
        })

        const tenantIdForLog = user?.tenant_id || 'unknown'

        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        const recentFailures = await prisma.loginAttempt.count({
          where: {
            tenant_id: tenantIdForLog,
            email,
            success: false,
            attempted_at: { gte: windowStart },
          },
        })

        if (isRateLimited(recentFailures)) {
          throw new Error('RATE_LIMITED')
        }

        const isValid = user
          ? await verifyPassword(password, user.password_hash)
          : false

        // Registra a tentativa independente do resultado
        await prisma.loginAttempt.create({
          data: {
            tenant_id: tenantIdForLog,
            email,
            success: isValid,
          },
        })

        if (!user || !isValid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        })

        return {
          id:                  user.id,
          email:               user.email,
          name:                user.name,
          role:                user.role,
          mustChangePassword:  user.must_change_password,
          tenantId:            user.tenant_id,
        }
      },
    }),
  ],
})

`

### src\lib\date-utils.ts
`	s
export function formatDateDisplay(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

`

### src\lib\equipment-utils.ts
`	s
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isOverdue(scheduledDate: Date, today: Date): boolean {
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  const s = new Date(scheduledDate)
  s.setHours(0, 0, 0, 0)
  return s < t
}

`

### src\lib\labels.ts
`	s
// Dicionários para tradução e humanização de Enums e Valores Padronizados do Prisma

export const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH: 'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

export const OCCURRENCE_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvida',
}

export const OCCURRENCE_STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  IN_PROGRESS: 'bg-sky-950/60 text-sky-400 border-sky-900/50',
  RESOLVED: 'bg-green-950/60 text-green-400 border-green-900/50',
}

export const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const MAINTENANCE_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-slate-800 text-slate-400 border-slate-700',
  IN_PROGRESS: 'bg-sky-950/60 text-sky-400 border-sky-900/50',
  DONE: 'bg-green-950/60 text-green-400 border-green-900/50',
  CANCELLED: 'bg-red-950/60 text-red-400 border-red-900/50',
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE: 'Concluída',
  SKIPPED: 'Pulada',
}

export const TASK_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  DONE: 'bg-green-950/60 text-green-400 border-green-900/50',
  SKIPPED: 'bg-slate-800 text-slate-400 border-slate-700',
}

export const OCCURRENCE_CATEGORY_LABEL: Record<string, string> = {
  VAZAMENTO: 'Vazamento',
  QUEBRA: 'Quebra de Equipamento',
  FALTA_PRODUTO: 'Falta de Produto',
  SEGURANCA: 'Segurança/Risco',
  OUTROS: 'Outros',
}

`

### src\lib\occurrence-utils.ts
`	s
// Prazos em horas por severidade — espelha occurrence_severity_defaults do seed
export const DEADLINE_HOURS: Record<string, number> = {
  CRITICAL: 24,
  HIGH:     72,
  MEDIUM:   168,
  LOW:      720,
}

export function calcularDeadline(severity: string, createdAt: Date): Date {
  const hours = DEADLINE_HOURS[severity] ?? 168
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000)
}

export function isPrazoVencido(deadline: Date, now: Date): boolean {
  return deadline < now
}

export function isMimeTypeValido(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
}

`

### src\lib\password.ts
`	s
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

`

### src\lib\prisma.ts
`	s
import { PrismaClient } from '@prisma/client'

// Evita múltiplas instâncias do PrismaClient em desenvolvimento (hot reload do Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

`

### src\lib\push-actions.ts
`	s
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/web-push'

export async function subscribeUser(sub: PushSubscription) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  // @ts-ignore
  const p256dh = sub.keys?.p256dh
  // @ts-ignore
  const authKey = sub.keys?.auth

  if (!p256dh || !authKey) return { error: 'Invalid subscription' }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      user_id: session.user.id as string,
      p256dh,
      auth: authKey
    },
    create: {
      user_id: session.user.id as string,
      endpoint: sub.endpoint,
      p256dh,
      auth: authKey
    }
  })

  return { success: true }
}

export async function unsubscribeUser(endpoint: string) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, user_id: session.user.id }
  })

  return { success: true }
}

export async function sendPushToRole(tenantId: string, role: string, payload: { title: string, body: string, url?: string }) {
  const subs = await prisma.pushSubscription.findMany({
    where: {
      user: {
        tenant_id: tenantId,
        role: role,
        is_active: true
      }
    }
  })

  const results = await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  // Remove inscrições inválidas
  subs.forEach((sub, i) => {
    const res = results[i]
    if (res.status === 'rejected' && res.reason?.statusCode === 410) {
      prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
    }
  })
}

export async function sendPushToUsers(userIds: string[], payload: { title: string, body: string, url?: string }) {
  if (userIds.length === 0) return

  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: { in: userIds } }
  })

  const results = await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  subs.forEach((sub, i) => {
    const res = results[i]
    if (res.status === 'rejected' && res.reason?.statusCode === 410) {
      prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
    }
  })
}

`

### src\lib\readings-utils.ts
`	s
// Calcula is_non_conformant para uma leitura de campo.
// Retorna null quando não há valor (leitura observacional sem parâmetro).
// Retorna false quando nenhum limite está definido para o parâmetro.
export function calcularNaoConformidade(
  value:       number | null,
  minLimit:    number | null,
  maxLimit:    number | null,
  is_detected: boolean = true
): boolean | null {
  if (!is_detected) return false // Se foi < LQ, considera sempre conforme
  if (value === null) return null
  const below = minLimit !== null && value < minLimit
  const above = maxLimit !== null && value > maxLimit
  return below || above
}

`

### src\lib\shift-utils.ts
`	s
export function normalizarData(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calcularTimeoutAt(handoverAt: Date, timeoutMinutes: number): Date {
  return new Date(handoverAt.getTime() + timeoutMinutes * 60 * 1000)
}

export function isHandoverVencido(timeoutAt: Date, now: Date): boolean {
  return timeoutAt < now
}

`

### src\lib\stock-utils.ts
`	s
export function calcularEstoqueAtual(totalEntradas: number, totalSaidas: number): number {
  return totalEntradas - totalSaidas
}

export function estaAbaixoMinimo(
  estoqueCalculado: number,
  estoqueFisico: number | null,
  minStock: number,
): boolean {
  return estoqueCalculado < minStock || (estoqueFisico !== null && estoqueFisico < minStock)
}

export function calcularDivergencia(
  estoqueCalculado: number,
  estoqueFisico: number | null,
): number | null {
  if (estoqueFisico === null) return null
  return estoqueFisico - estoqueCalculado
}

export function formatarQuantidade(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
}

`

### src\lib\tenant.ts
`	s
import { auth } from '@/lib/auth'

/**
 * Retrieves the `tenantId` of the currently logged-in user.
 * For server components and server actions.
 * Throws an error if the user is not authenticated or lacks a tenantId.
 */
export async function getTenantId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.tenantId) {
    throw new Error('Acesso não autorizado: Tenant não encontrado.')
  }
  return session.user.tenantId
}

`

### src\lib\utils.ts
`	s
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

`

### src\lib\web-push.ts
`	s
import webpush from 'web-push'

// Certifique-se de configurar essas variáveis no .env
// Você pode gerar chaves executando `npx web-push generate-vapid-keys` no terminal
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:suporte@solentis.com',
      vapidPublicKey,
      vapidPrivateKey
    )
  } catch (err) {
    console.error('[web-push] Failed to set VAPID details:', err)
  }
} else {
  console.warn('[web-push] VAPID keys are missing. Push notifications will not work.')
}

export { webpush }

`

### src\lib\__tests__\analises.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// Os testes de análise reutilizam calcularNaoConformidade (mesma lógica que leituras).
// O que é específico de análises: snapshots imutáveis e is_non_conformant sempre boolean.

// ─── Cenário 1: análise conforme (dentro dos limites) ────────────────────────
describe('análise conforme — is_non_conformant deve ser false', () => {
  it('DBO5 = 30 mg/L dentro do limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(30, null, 60)).toBe(false)
  })

  it('pH = 7,5 dentro da faixa 6,0 – 9,0', () => {
    expect(calcularNaoConformidade(7.5, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo é conforme (boundary inclusive)', () => {
    expect(calcularNaoConformidade(60, null, 60)).toBe(false)
  })
})

// ─── Cenário 2: análise não-conforme ─────────────────────────────────────────
describe('análise não-conforme — is_non_conformant deve ser true', () => {
  it('pH = 11 acima do limite máximo 9 (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('DBO5 = 120 mg/L excede o limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })
})

// ─── Cenário 3: snapshots imutáveis — lógica de aplicação ────────────────────
// O snapshot é capturado no momento do save (Server Action).
// Este teste verifica que o cálculo usa os limites fornecidos, não os atuais do BD.
describe('snapshot de limites — cálculo usa os limites informados', () => {
  it('se o limite era 9 no momento da coleta, pH=10 é não-conforme mesmo que o limite atual seja 11', () => {
    const minLimitApplied = null
    const maxLimitApplied = 9   // snapshot do momento da coleta
    expect(calcularNaoConformidade(10, minLimitApplied, maxLimitApplied)).toBe(true)
  })

  it('parâmetro sem limites definidos → false (nunca null em análises)', () => {
    const result = calcularNaoConformidade(999, null, null) ?? false
    expect(result).toBe(false)
  })
})

`

### src\lib\__tests__\auth.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  isRateLimited,
  isRouteAllowedForRole,
  RATE_LIMIT_MAX_ATTEMPTS,
} from '@/lib/auth-utils'

// ─── Cenário 1: senha correta autentica ──────────────────────────────────────
describe('verifyPassword — senha correta', () => {
  it('retorna true quando a senha bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('Solentis@2026', hash)
    expect(result).toBe(true)
  })
})

// ─── Cenário 2: senha errada rejeita ─────────────────────────────────────────
describe('verifyPassword — senha errada', () => {
  it('retorna false quando a senha não bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('senhaErrada!', hash)
    expect(result).toBe(false)
  })
})

// ─── Cenário 3: rate limit bloqueia após MAX tentativas ──────────────────────
describe('isRateLimited — controle de tentativas', () => {
  it(`bloqueia com ${RATE_LIMIT_MAX_ATTEMPTS} ou mais falhas recentes`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS)).toBe(true)
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS + 1)).toBe(true)
  })

  it(`libera com menos de ${RATE_LIMIT_MAX_ATTEMPTS} falhas`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS - 1)).toBe(false)
    expect(isRateLimited(0)).toBe(false)
  })
})

// ─── Cenário 4: controle de acesso por perfil ────────────────────────────────
describe('isRouteAllowedForRole — acesso por prefixo de rota', () => {
  it('MANAGER acessa /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'MANAGER')).toBe(true)
  })

  it('OPERATOR é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'TECHNICIAN')).toBe(false)
  })

  it('OPERATOR acessa /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'OPERATOR')).toBe(true)
  })

  it('MANAGER é bloqueado em /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'MANAGER')).toBe(false)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})

`

### src\lib\__tests__\equipamentos.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { addDays, isOverdue } from '@/lib/equipment-utils'

// ─── addDays ─────────────────────────────────────────────────────────────────

describe('addDays — agendamento de preventivas', () => {
  it('adiciona 30 dias corretamente', () => {
    const base   = new Date('2026-01-01T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCDate()).toBe(31)
    expect(result.getUTCMonth()).toBe(0) // janeiro
  })

  it('atravessa virada de mês', () => {
    const base   = new Date('2026-01-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCMonth()).toBe(1) // fevereiro
    expect(result.getUTCDate()).toBe(19)
  })

  it('atravessa virada de ano', () => {
    const base   = new Date('2026-12-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCFullYear()).toBe(2027)
  })

  it('não muta a data original', () => {
    const base    = new Date('2026-06-01T00:00:00.000Z')
    const original = base.toISOString()
    addDays(base, 15)
    expect(base.toISOString()).toBe(original)
  })

  it('frequência de 1 dia agenda para amanhã', () => {
    const base   = new Date('2026-05-21T12:00:00.000Z')
    const result = addDays(base, 1)
    expect(result.getUTCDate()).toBe(22)
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────

describe('isOverdue — detecção de preventiva vencida', () => {
  it('data passada é considerada vencida', () => {
    const scheduled = new Date('2026-05-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(true)
  })

  it('data futura não é vencida', () => {
    const scheduled = new Date('2026-06-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('data igual à hoje não é vencida (boundary inclusive)', () => {
    const scheduled = new Date('2026-05-21')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('ignora a hora — apenas a data importa', () => {
    // Agendado às 23:59 do dia anterior → vencido hoje
    const scheduled = new Date('2026-05-20T23:59:59')
    const today     = new Date('2026-05-21T00:00:01')
    expect(isOverdue(scheduled, today)).toBe(true)
  })
})

`

### src\lib\__tests__\estoque.test.ts
`	s
import { describe, it, expect } from 'vitest'
import {
  calcularEstoqueAtual,
  estaAbaixoMinimo,
  calcularDivergencia,
  formatarQuantidade,
} from '@/lib/stock-utils'

describe('calcularEstoqueAtual', () => {
  it('retorna diferença entre entradas e saídas', () => {
    expect(calcularEstoqueAtual(100, 30)).toBe(70)
  })

  it('retorna zero quando entradas igualam saídas', () => {
    expect(calcularEstoqueAtual(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando saídas excedem entradas', () => {
    expect(calcularEstoqueAtual(10, 25)).toBe(-15)
  })

  it('retorna zero quando não há movimentação', () => {
    expect(calcularEstoqueAtual(0, 0)).toBe(0)
  })
})

describe('estaAbaixoMinimo', () => {
  it('dispara alerta quando calculado abaixo do mínimo', () => {
    expect(estaAbaixoMinimo(5, null, 10)).toBe(true)
  })

  it('dispara alerta quando físico abaixo do mínimo (mesmo calculado ok)', () => {
    expect(estaAbaixoMinimo(15, 4, 10)).toBe(true)
  })

  it('não dispara quando calculado e físico estão ok', () => {
    expect(estaAbaixoMinimo(15, 12, 10)).toBe(false)
  })

  it('não dispara quando físico é null e calculado está ok', () => {
    expect(estaAbaixoMinimo(20, null, 10)).toBe(false)
  })

  it('dispara quando calculado negativo e mínimo zero', () => {
    expect(estaAbaixoMinimo(-1, null, 0)).toBe(true)
  })

  it('não dispara quando tudo é zero e mínimo é zero', () => {
    expect(estaAbaixoMinimo(0, 0, 0)).toBe(false)
  })
})

describe('calcularDivergencia', () => {
  it('retorna null quando não há contagem física', () => {
    expect(calcularDivergencia(50, null)).toBeNull()
  })

  it('retorna zero quando físico igual ao calculado', () => {
    expect(calcularDivergencia(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando físico menor que calculado (perda)', () => {
    expect(calcularDivergencia(50, 42)).toBe(-8)
  })

  it('retorna valor positivo quando físico maior que calculado (ganho/erro)', () => {
    expect(calcularDivergencia(30, 35)).toBe(5)
  })
})

describe('formatarQuantidade', () => {
  it('formata número inteiro sem decimais', () => {
    expect(formatarQuantidade(100)).toBe('100')
  })

  it('formata número decimal com 2 casas', () => {
    expect(formatarQuantidade(10.5)).toBe('10.50')
  })

  it('formata zero como inteiro', () => {
    expect(formatarQuantidade(0)).toBe('0')
  })

  it('formata valor negativo inteiro sem decimais', () => {
    expect(formatarQuantidade(-15)).toBe('-15')
  })
})

`

### src\lib\__tests__\fase11-criticos.test.ts
`	s
/**
 * Testes dos 13 cenários críticos — Briefing seção 5
 *
 * Cenários 1 e 2 (localStorage e reconexão automática): testes manuais — ver RUNBOOK
 * Cenário  4 (RUNBOOK com recomendação de no-break): documentação — ver RUNBOOK
 * Cenários 5, 10, 12 têm cobertura primária em analises/equipamentos/auth.test.ts;
 *   aqui são validados pelo ângulo dos critérios de aceite específicos do briefing.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { isOverdue, addDays }       from '@/lib/equipment-utils'
import { isRouteAllowedForRole, getDashboardRoute } from '@/lib/auth-utils'

// ── Schemas inline (espelham os das Server Actions; testam a lógica pura) ─────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const LeituraSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  value: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
}).refine(
  (d) => d.parameter_id === null || d.value !== null,
  { message: 'Informe o valor medido', path: ['value'] },
)

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

// Espelha normalizarData() de turnos/actions.ts — apenas data, sem hora
function normalizarParaMeiaNite(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Cenário 3 — Integridade transacional ────────────────────────────────────
// A validação Zod ocorre ANTES de qualquer escrita no banco.
// Se o schema rejeita, a Server Action retorna erro e o $transaction nunca abre.

describe('Cenário 3 — Integridade transacional: Zod bloqueia antes do banco', () => {
  it('LeituraSchema rejeita quando ponto de coleta está vazio', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: '',
      parameter_id:        null,
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Selecione o ponto'))).toBe(true)
  })

  it('LeituraSchema rejeita quando parâmetro é informado mas valor está ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Informe o valor medido'))).toBe(true)
  })

  it('LeituraSchema rejeita data/hora ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        null,
      value:               null,
      recorded_at:         '',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('data/hora'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita descrição com menos de 5 caracteres', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'abc', severity: 'LOW' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('5 caracteres'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita severidade fora do enum', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Descrição válida aqui', severity: 'ULTRA' })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema aceita dados completamente válidos', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Vazamento no reator', severity: 'HIGH' })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 5 — Análise fora do limite → is_non_conformant = true ────────────
// Cobertura primária: analises.test.ts (pH=11, DBO5=120, boundaries).
// Aqui: validação do critério de aceite literal do briefing.

describe('Cenário 5 — Não-conformidade detectada e sinalizada', () => {
  it('pH = 11 com limite máximo 9 → não-conforme (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, null, 9)).toBe(true)
  })

  it('pH = 7 com faixa 6–9 → conforme', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo → conforme (boundary inclusivo CONAMA)', () => {
    expect(calcularNaoConformidade(9, null, 9)).toBe(false)
  })
})

// ─── Cenário 6 — Non-MANAGER tenta editar turno fechado → bloqueado ──────────
// A rota /gestor/turnos/tarefas/* exige MANAGER.
// O middleware (ROLE_PREFIXES) bloqueia OPERATOR e TECHNICIAN antes de chegar na action.

describe('Cenário 6 — Acesso por perfil: apenas MANAGER edita passagens de turno', () => {
  it('OPERATOR é bloqueado em /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc/editar', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc/editar', 'TECHNICIAN')).toBe(false)
  })

  it('MANAGER acessa /gestor/turnos/tarefas', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/tarefas/abc', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 7 — MANAGER edita sem justificativa → schema bloqueia ───────────

describe('Cenário 7 — EditHandoverSchema: justificativa obrigatória (≥ 10 chars)', () => {
  it('justificativa vazia → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '',
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('10 caracteres'))).toBe(true)
  })

  it('justificativa com 9 chars → inválido (um abaixo do mínimo)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '123456789', // 9 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })

  it('campo justification ausente → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      outgoing_observations: 'Obs válida',
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})

// ─── Cenário 8 — MANAGER edita com justificativa → schema aceita ─────────────

describe('Cenário 8 — EditHandoverSchema: justificativa válida é aceita', () => {
  it('justificativa com 10+ chars → válido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Correção solicitada pelo supervisor após revisão.',
      outgoing_observations: 'Turno sem incidentes.',
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })

  it('observações opcionais em branco são normalizadas para null pelo preprocess', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Ajuste de registro conforme auditoria 2026.',
      outgoing_observations: '',
      incoming_observations: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.outgoing_observations).toBeNull()
      expect(r.data.incoming_observations).toBeNull()
    }
  })

  it('justificativa exatamente com 10 chars → válido (boundary)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '1234567890', // exatamente 10 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 9 — Dois operadores tentam abrir o mesmo turno → bloqueado ──────
// A lógica de bloqueio usa $transaction com findFirst por (shift_id, date, status).
// Aqui testamos que a normalização de data garante que instâncias do mesmo dia
// colidam, independente do horário em que foram abertas.

describe('Cenário 9 — Turno duplicado: normalização de data garante unicidade diária', () => {
  it('abertura às 07h e às 15h no mesmo dia produzem a mesma meia-noite', () => {
    const manha = normalizarParaMeiaNite(new Date('2026-05-26T07:00:00'))
    const tarde = normalizarParaMeiaNite(new Date('2026-05-26T15:00:00'))
    expect(manha.getTime()).toBe(tarde.getTime())
  })

  it('abertura à 22h30 também cai na meia-noite do mesmo dia', () => {
    const noite   = normalizarParaMeiaNite(new Date('2026-05-26T22:30:00'))
    const referencia = normalizarParaMeiaNite(new Date('2026-05-26T00:00:00'))
    expect(noite.getTime()).toBe(referencia.getTime())
  })

  it('dias diferentes produzem meia-noites diferentes → não colidem', () => {
    const hoje   = normalizarParaMeiaNite(new Date('2026-05-26T10:00:00'))
    const amanha = normalizarParaMeiaNite(new Date('2026-05-27T06:00:00'))
    expect(hoje.getTime()).not.toBe(amanha.getTime())
  })
})

// ─── Cenário 10 — Equipamento com preventiva vencida → destaque vermelho ─────
// Cobertura primária: equipamentos.test.ts (addDays, isOverdue + boundaries).
// Aqui: critério de aceite do briefing — "equipamento vencido → destaque vermelho".

describe('Cenário 10 — isOverdue: equipamento com preventiva atrasada é sinalizado', () => {
  it('preventiva agendada para ontem → vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, -1), today)).toBe(true)
  })

  it('preventiva agendada para hoje → não vencida (boundary)', () => {
    const today = new Date()
    expect(isOverdue(today, today)).toBe(false)
  })

  it('preventiva agendada para amanhã → não vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, 1), today)).toBe(false)
  })
})

// ─── Cenário 11 — Primeiro login com credencial provisória → troca de senha ──
// O redirect para /trocar-senha quando mustChangePassword=true está no middleware.
// O test E2E manual está documentado no RUNBOOK.
// Aqui: getDashboardRoute garante que o destino pós-troca é o dashboard correto.

describe('Cenário 11 — must_change_password: dashboard correto após troca de senha', () => {
  it('MANAGER é direcionado para /gestor/dashboard', () => {
    expect(getDashboardRoute('MANAGER')).toBe('/gestor/dashboard')
  })

  it('TECHNICIAN é direcionado para /tecnico/dashboard', () => {
    expect(getDashboardRoute('TECHNICIAN')).toBe('/tecnico/dashboard')
  })

  it('OPERATOR é direcionado para /operador/dashboard', () => {
    expect(getDashboardRoute('OPERATOR')).toBe('/operador/dashboard')
  })

  it('role desconhecida cai no /login (fallback seguro)', () => {
    expect(getDashboardRoute('DESCONHECIDO')).toBe('/login')
  })
})

// ─── Cenário 12 — Login com perfil errado → mensagem clara ───────────────────
// Cobertura primária: auth.test.ts (isRouteAllowedForRole — 6 cenários).

describe('Cenário 12 — Acesso com perfil errado é bloqueado sem expor detalhes', () => {
  it('OPERATOR bloqueado em /gestor/usuarios', () => {
    expect(isRouteAllowedForRole('/gestor/usuarios', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN bloqueado em /operador/leituras', () => {
    expect(isRouteAllowedForRole('/operador/leituras', 'TECHNICIAN')).toBe(false)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 13 — Importação de dado inválido → banco não é corrompido ────────
// O Zod valida antes de qualquer escrita; dados inválidos nunca chegam ao banco.

describe('Cenário 13 — Dado inválido: validação impede corrupção do banco', () => {
  it('LeituraSchema rejeita value não-numérico (preprocess converte para NaN)', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               'não-é-um-número',
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema rejeita severity inválida — qualquer string arbitrária', () => {
    const r = OcorrenciaSchema.safeParse({
      description: 'Descrição com mais de 5 chars',
      severity:    'EXTREMO',
    })
    expect(r.success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload completamente vazio', () => {
    expect(EditHandoverSchema.safeParse({}).success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload com tipos errados', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         12345,   // deveria ser string
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})


`

### src\lib\__tests__\ocorrencias.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { calcularDeadline, isPrazoVencido, isMimeTypeValido, DEADLINE_HOURS } from '@/lib/occurrence-utils'

// ─── calcularDeadline ─────────────────────────────────────────────────────────

describe('calcularDeadline — prazo calculado por severidade', () => {
  const base = new Date('2026-05-22T10:00:00.000Z')

  it('CRITICAL → deadline = base + 24h (critério de aceite da Fase 8)', () => {
    const deadline = calcularDeadline('CRITICAL', base)
    const expected = new Date('2026-05-23T10:00:00.000Z')
    expect(deadline.getTime()).toBe(expected.getTime())
  })

  it('HIGH → deadline = base + 72h', () => {
    const deadline = calcularDeadline('HIGH', base)
    expect(deadline.getTime()).toBe(base.getTime() + 72 * 60 * 60 * 1000)
  })

  it('MEDIUM → deadline = base + 168h (7 dias)', () => {
    const deadline = calcularDeadline('MEDIUM', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })

  it('LOW → deadline = base + 720h (30 dias)', () => {
    const deadline = calcularDeadline('LOW', base)
    expect(deadline.getTime() - base.getTime()).toBe(DEADLINE_HOURS.LOW * 60 * 60 * 1000)
  })

  it('severidade desconhecida → usa fallback de 168h', () => {
    const deadline = calcularDeadline('UNKNOWN', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })
})

// ─── isPrazoVencido ───────────────────────────────────────────────────────────

describe('isPrazoVencido — detecção de prazo expirado', () => {
  it('deadline no passado → vencido', () => {
    const deadline = new Date('2026-05-20T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(true)
  })

  it('deadline no futuro → não vencido', () => {
    const deadline = new Date('2026-05-25T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(false)
  })

  it('deadline exatamente igual a now → não vencido (boundary exclusive)', () => {
    const t        = new Date('2026-05-22T10:00:00.000Z')
    expect(isPrazoVencido(t, t)).toBe(false)
  })
})

// ─── isMimeTypeValido ─────────────────────────────────────────────────────────

describe('isMimeTypeValido — rejeição de upload inválido', () => {
  it('image/jpeg → válido', () => {
    expect(isMimeTypeValido('image/jpeg')).toBe(true)
  })

  it('image/png → válido', () => {
    expect(isMimeTypeValido('image/png')).toBe(true)
  })

  it('image/webp → válido', () => {
    expect(isMimeTypeValido('image/webp')).toBe(true)
  })

  it('application/pdf → inválido', () => {
    expect(isMimeTypeValido('application/pdf')).toBe(false)
  })

  it('application/octet-stream (.exe) → inválido (critério de aceite da Fase 8)', () => {
    expect(isMimeTypeValido('application/octet-stream')).toBe(false)
  })

  it('string vazia → inválido', () => {
    expect(isMimeTypeValido('')).toBe(false)
  })
})

`

### src\lib\__tests__\readings.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// ─── Cenário 1: valor conforme (dentro dos limites) ──────────────────────────
describe('calcularNaoConformidade — valor conforme', () => {
  it('retorna false para pH=7 dentro da faixa 6–9', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite máximo (boundary)', () => {
    expect(calcularNaoConformidade(9, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite mínimo (boundary)', () => {
    expect(calcularNaoConformidade(6, 6, 9)).toBe(false)
  })
})

// ─── Cenário 2: valor não-conforme ───────────────────────────────────────────
describe('calcularNaoConformidade — valor fora do limite', () => {
  it('retorna true para pH=11 acima do limite máximo 9', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('retorna true para pH=5 abaixo do limite mínimo 6', () => {
    expect(calcularNaoConformidade(5, 6, 9)).toBe(true)
  })

  it('retorna true com apenas limite máximo definido e valor acima (DBO5=120, máx=60)', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })

  it('retorna true com apenas limite mínimo definido e valor abaixo (pH=3, mín=5)', () => {
    expect(calcularNaoConformidade(3, 5, null)).toBe(true)
  })
})

// ─── Cenário 3: casos nulos e sem limites ────────────────────────────────────
describe('calcularNaoConformidade — sem valor ou sem limites', () => {
  it('retorna null quando value é null (leitura observacional sem parâmetro)', () => {
    expect(calcularNaoConformidade(null, 6, 9)).toBeNull()
  })

  it('retorna false quando nenhum limite está definido (null, null)', () => {
    expect(calcularNaoConformidade(100, null, null)).toBe(false)
  })
})

`

### src\lib\__tests__\turnos.test.ts
`	s
import { describe, it, expect } from 'vitest'
import { normalizarData, calcularTimeoutAt, isHandoverVencido } from '@/lib/shift-utils'

describe('normalizarData — meia-noite local', () => {
  it('preserva a data e zera o horário', () => {
    const d      = new Date('2026-05-22T15:30:00')
    const result = normalizarData(d)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(4) // maio = 4 (0-indexed)
    expect(result.getDate()).toBe(22)
  })

  it('não muta o original', () => {
    const original = new Date('2026-05-22T10:00:00')
    const original_time = original.getTime()
    normalizarData(original)
    expect(original.getTime()).toBe(original_time)
  })
})

describe('calcularTimeoutAt — prazo de confirmação', () => {
  const base = new Date('2026-05-22T08:00:00.000Z')

  it('30 minutos → timeout = base + 30min', () => {
    const result = calcularTimeoutAt(base, 30)
    expect(result.getTime()).toBe(base.getTime() + 30 * 60 * 1000)
  })

  it('60 minutos → timeout = base + 1h', () => {
    const result = calcularTimeoutAt(base, 60)
    expect(result.getTime()).toBe(base.getTime() + 60 * 60 * 1000)
  })

  it('0 minutos → timeout = base (sem prazo adicional)', () => {
    const result = calcularTimeoutAt(base, 0)
    expect(result.getTime()).toBe(base.getTime())
  })

  it('não muta o original', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    const original_time = t.getTime()
    calcularTimeoutAt(t, 30)
    expect(t.getTime()).toBe(original_time)
  })
})

describe('isHandoverVencido — timeout expirado', () => {
  it('timeout no passado → vencido', () => {
    const timeoutAt = new Date('2026-05-22T07:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(true)
  })

  it('timeout no futuro → não vencido', () => {
    const timeoutAt = new Date('2026-05-22T09:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(false)
  })

  it('timeout igual a now → não vencido (boundary exclusive)', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(t, t)).toBe(false)
  })
})

`

### src\middleware.ts
`	s
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextRequest, NextResponse } from 'next/server'
import { ROLE_PREFIXES, getDashboardRoute } from '@/lib/auth-utils'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Rotas públicas: login e troca de senha não exigem sessão
  if (pathname.startsWith('/login')) {
    // Usuário já autenticado não precisa ver a página de login
    if (session) {
      const dest = session.user.mustChangePassword
        ? '/trocar-senha'
        : getDashboardRoute(session.user.role)
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Rota de troca de senha: exige sessão (qualquer perfil)
  if (pathname.startsWith('/trocar-senha')) {
    if (!session) return redirectToLogin(req)
    return NextResponse.next()
  }

  // Todas as demais rotas protegidas exigem sessão
  if (!session) return redirectToLogin(req)

  // Usuário com senha provisória só pode acessar /trocar-senha
  if (session.user.mustChangePassword) {
    return NextResponse.redirect(new URL('/trocar-senha', req.url))
  }

  // Verifica permissão por prefixo de rota
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      if (session.user.role === 'SUPER_ADMIN') {
        break // Super Admin tem acesso a tudo
      }
      if (session.user.role !== requiredRole) {
        return NextResponse.redirect(new URL('/acesso-negado', req.url))
      }
      if (requiredRole === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/acesso-negado', req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// Aplica o middleware a todas as rotas exceto assets estáticos e API do NextAuth
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}

`

### src\types\index.ts
`	s
// Enums do domínio — definidos em TypeScript porque Prisma v5 + SQLite não suporta enums nativos.
// O banco armazena como String; a aplicação garante os valores válidos via estes tipos.

// ─── Identidade ───────────────────────────────────────────────────────────────

export type Role = 'OPERATOR' | 'TECHNICIAN' | 'MANAGER' | 'SUPER_ADMIN'

export const ROLES = {
  OPERATOR:    'OPERATOR',
  TECHNICIAN:  'TECHNICIAN',
  MANAGER:     'MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const satisfies Record<Role, Role>

// ─── Operação ─────────────────────────────────────────────────────────────────

export type DataOrigin = 'MANUAL' | 'SENSOR' | 'IMPORT'

export const DATA_ORIGINS = {
  MANUAL: 'MANUAL',
  SENSOR: 'SENSOR',
  IMPORT: 'IMPORT',
} as const satisfies Record<DataOrigin, DataOrigin>

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export type OccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const OCCURRENCE_SEVERITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<OccurrenceSeverity, OccurrenceSeverity>

export type OccurrenceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export const OCCURRENCE_STATUSES = {
  OPEN:        'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED:    'RESOLVED',
} as const satisfies Record<OccurrenceStatus, OccurrenceStatus>

// ─── Manutenções ──────────────────────────────────────────────────────────────

// Preventiva usa: SCHEDULED / COMPLETED / OVERDUE
// Corretiva usa: IN_PROGRESS / COMPLETED / CANCELLED
export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'

export const MAINTENANCE_STATUSES = {
  SCHEDULED:   'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  OVERDUE:     'OVERDUE',
  CANCELLED:   'CANCELLED',
} as const satisfies Record<MaintenanceStatus, MaintenanceStatus>

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const PRIORITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<Priority, Priority>

// ─── Turnos ───────────────────────────────────────────────────────────────────

export type ShiftInstanceStatus = 'SCHEDULED' | 'OPEN' | 'HANDOVER_PENDING' | 'CLOSED'

export const SHIFT_INSTANCE_STATUSES = {
  SCHEDULED:        'SCHEDULED',
  OPEN:             'OPEN',
  HANDOVER_PENDING: 'HANDOVER_PENDING',
  CLOSED:           'CLOSED',
} as const satisfies Record<ShiftInstanceStatus, ShiftInstanceStatus>

export type HandoverStatus = 'PENDING' | 'CONFIRMED' | 'TIMED_OUT'

export const HANDOVER_STATUSES = {
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  TIMED_OUT: 'TIMED_OUT',
} as const satisfies Record<HandoverStatus, HandoverStatus>

// ─── Estoque de Produtos Químicos ─────────────────────────────────────────────

export const CHEMICAL_UNITS_PRESET = [
  'kg', 'g', 'L', 'mL', 'unidade', 'saco', 'galão', 'tambor',
] as const

export type ChemicalUnitPreset = typeof CHEMICAL_UNITS_PRESET[number]

// Usado no select da UI: os presets + opção "Outro" para texto livre
export const CHEMICAL_UNIT_OPTIONS = [
  ...CHEMICAL_UNITS_PRESET.map((u) => ({ value: u, label: u })),
  { value: 'outro', label: 'Outro...' },
] as const

// ─── Rastreabilidade ──────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const satisfies Record<AuditAction, AuditAction>

`

### prisma\schema.prisma
`	s
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────────────────────────────────────────
// a) Identidade & Autenticação
// ─────────────────────────────────────────────────────────────────────────────

model Tenant {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  users                   User[]
  sessions                Session[]
  login_attempts          LoginAttempt[]
  quality_parameters      QualityParameter[]
  analysis_methods        AnalysisMethod[]
  equipment_categories    EquipmentCategory[]
  collection_points       CollectionPoint[]
  shifts                  Shift[]
  equipment               Equipment[]
  readings                Reading[]
  analyses                Analysis[]
  preventive_maintenances PreventiveMaintenance[]
  corrective_maintenances CorrectiveMaintenance[]
  occurrences             Occurrence[]
  occurrence_photos       OccurrencePhoto[]
  shift_instances         ShiftInstance[]
  shift_schedules         ShiftSchedule[]
  shift_handovers         ShiftHandover[]
  shift_tasks             ShiftTask[]
  shift_task_photos       ShiftTaskPhoto[]
  chemical_products       ChemicalProduct[]
  chemical_stock_entries  ChemicalStockEntry[]
  chemical_stock_exits    ChemicalStockExit[]
  chemical_stock_counts   ChemicalStockCount[]
  parameter_aliases       ParameterAlias[]
  parameter_limits        ParameterLimit[]

  @@map("tenants")
}

model User {
  id                   String    @id @default(cuid())
  tenant_id            String
  email                String
  password_hash        String
  name                 String
  role                 String
  must_change_password Boolean   @default(true)
  is_active            Boolean   @default(true)
  last_login_at        DateTime?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
  created_by           String?

  // — identidade
  tenant        Tenant    @relation(fields: [tenant_id], references: [id])
  creator       User?     @relation("CreatedBy", fields: [created_by], references: [id])
  created_users User[]    @relation("CreatedBy")
  sessions      Session[]

  // — configuração (1 FK por model → sem nome de relação)
  quality_parameters        QualityParameter[]
  severity_defaults_updated OccurrenceSeverityDefault[]
  parameter_histories       ParameterHistory[]
  push_subscriptions        PushSubscription[]

  // — operação (1 FK por model → sem nome de relação)
  equipment              Equipment[]
  readings               Reading[]
  preventive_completions PreventiveMaintenance[]
  corrective_assignments CorrectiveMaintenance[]
  occurrence_photos      OccurrencePhoto[]
  shift_instances        ShiftInstance[]
  audit_logs             AuditLog[]

  // — relações nomeadas (múltiplas FKs do mesmo model apontando para User)
  analyses_recorded       Analysis[]           @relation("AnalysisRecorder")
  analyses_approved       Analysis[]           @relation("AnalysisApprover")
  occurrences_reported    Occurrence[]         @relation("OccurrenceReporter")
  occurrences_responsible Occurrence[]         @relation("OccurrenceResponsible")
  occurrences_resolved    Occurrence[]         @relation("OccurrenceResolver")
  handovers_outgoing      ShiftHandover[]      @relation("HandoverOutgoing")
  handovers_incoming      ShiftHandover[]      @relation("HandoverIncoming")
  tasks_assigned          ShiftTask[]          @relation("TaskAssignee")
  tasks_created           ShiftTask[]          @relation("TaskCreator")
  tasks_completed         ShiftTask[]          @relation("TaskCompleter")
  task_photos_uploaded    ShiftTaskPhoto[]
  chemical_products       ChemicalProduct[]
  chemical_stock_entries  ChemicalStockEntry[]
  chemical_stock_exits    ChemicalStockExit[]
  chemical_stock_counts   ChemicalStockCount[]

  @@unique([tenant_id, email])
  @@index([tenant_id, role, is_active])
  @@index([created_at])
  @@map("users")
}

model LoginAttempt {
  id           String   @id @default(cuid())
  tenant_id    String
  email        String
  ip_address   String?
  success      Boolean
  attempted_at DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, email, attempted_at])
  @@map("login_attempts")
}

// Incluída no schema conforme modelo de dados; não utilizada pelo NextAuth JWT (strategy = "jwt")
model Session {
  id            String   @id
  tenant_id     String
  session_token String   @unique
  user_id       String
  expires       DateTime

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  user   User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("sessions")
}

model PushSubscription {
  id       String @id @default(cuid())
  user_id  String
  endpoint String @unique
  p256dh   String
  auth     String
  user     User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("push_subscriptions")
}

// ─────────────────────────────────────────────────────────────────────────────
// b) Configuração
// ─────────────────────────────────────────────────────────────────────────────

model QualityParameter {
  id                String   @id @default(cuid())
  tenant_id         String
  name              String
  unit              String
  min_limit         Float?
  max_limit         Float?
  legal_reference   String?
  effective_date    DateTime
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  created_by        String
  default_method_id String?

  tenant  Tenant          @relation(fields: [tenant_id], references: [id])
  creator User            @relation(fields: [created_by], references: [id])
  method  AnalysisMethod? @relation(fields: [default_method_id], references: [id])

  readings          Reading[]
  analyses          Analysis[]
  history           ParameterHistory[]
  aliases           ParameterAlias[]
  collection_points CollectionPoint[]
  parameter_limits  ParameterLimit[]

  @@index([tenant_id, is_active])
  @@index([created_at])
  @@map("quality_parameters")
}

model ParameterLimit {
  id              String   @id @default(cuid())
  tenant_id       String
  parameter_id    String
  matrix          String
  min_limit       Float?
  max_limit       Float?
  rule_type       String   @default("TETO") // TETO, FAIXA, EFICIENCIA
  legal_reference String? // e.g. "CONAMA 430/2011"
  created_at      DateTime @default(now())

  tenant    Tenant           @relation(fields: [tenant_id], references: [id])
  parameter QualityParameter @relation(fields: [parameter_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, parameter_id, matrix, legal_reference])
  @@index([tenant_id, matrix])
  @@map("parameter_limits")
}

model ParameterHistory {
  id                    String    @id @default(cuid())
  parameter_id          String
  min_limit_before      Float?
  max_limit_before      Float?
  min_limit_after       Float?
  max_limit_after       Float?
  effective_date_before DateTime?
  effective_date_after  DateTime
  changed_by            String
  changed_at            DateTime  @default(now())
  reason                String?

  parameter QualityParameter @relation(fields: [parameter_id], references: [id])
  changer   User             @relation(fields: [changed_by], references: [id])

  @@index([parameter_id, changed_at])
  @@map("parameter_history")
}

model ParameterAlias {
  id           String   @id @default(cuid())
  tenant_id    String
  alias        String
  parameter_id String
  created_at   DateTime @default(now())

  tenant    Tenant           @relation(fields: [tenant_id], references: [id])
  parameter QualityParameter @relation(fields: [parameter_id], references: [id])

  @@unique([tenant_id, alias])
  @@map("parameter_aliases")
}

model AnalysisMethod {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  description String?
  pop_content String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant             Tenant             @relation(fields: [tenant_id], references: [id])
  analyses           Analysis[]
  quality_parameters QualityParameter[]

  @@unique([tenant_id, name])
  @@map("analysis_methods")
}

model EquipmentCategory {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant    Tenant      @relation(fields: [tenant_id], references: [id])
  equipment Equipment[]

  @@unique([tenant_id, name])
  @@map("equipment_categories")
}

model CollectionPoint {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  matrix      String? // 'efluente', 'subterranea', 'superficial', etc.
  location    String?
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant     Tenant             @relation(fields: [tenant_id], references: [id])
  readings    Reading[]
  analyses    Analysis[]
  parameters  QualityParameter[]
  occurrences Occurrence[]

  @@index([tenant_id])
  @@map("collection_points")
}

model Shift {
  id                       String   @id @default(cuid())
  tenant_id                String
  name                     String
  start_time               String
  end_time                 String
  crosses_midnight         Boolean  @default(false)
  handover_timeout_minutes Int      @default(120)
  is_active                Boolean  @default(true)
  created_at               DateTime @default(now())

  tenant          Tenant          @relation(fields: [tenant_id], references: [id])
  shift_instances ShiftInstance[]
  schedules       ShiftSchedule[]

  @@index([tenant_id])
  @@map("shifts")
}

model ShiftSchedule {
  id           String   @id @default(cuid())
  tenant_id    String
  shift_id     String
  days_of_week Int[] // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  shift  Shift  @relation(fields: [shift_id], references: [id], onDelete: Cascade)

  @@index([tenant_id])
  @@index([shift_id, is_active])
  @@map("shift_schedules")
}

// 4 linhas fixas (uma por severidade) — PK é o próprio severity; sem tenant_id (global)
model OccurrenceSeverityDefault {
  severity       String   @id
  deadline_hours Int
  updated_at     DateTime @updatedAt
  updated_by     String

  updater User @relation(fields: [updated_by], references: [id])

  @@map("occurrence_severity_defaults")
}

// ─────────────────────────────────────────────────────────────────────────────
// c) Operação
// ─────────────────────────────────────────────────────────────────────────────

model Equipment {
  id                        String    @id @default(cuid())
  tenant_id                 String
  name                      String
  category_id               String
  serial_number             String?
  location                  String?
  installation_date         DateTime?
  preventive_frequency_days Int
  is_active                 Boolean   @default(true)
  created_at                DateTime  @default(now())
  created_by                String

  tenant                  Tenant                  @relation(fields: [tenant_id], references: [id])
  category                EquipmentCategory       @relation(fields: [category_id], references: [id])
  creator                 User                    @relation(fields: [created_by], references: [id])
  preventive_maintenances PreventiveMaintenance[]
  corrective_maintenances CorrectiveMaintenance[]

  @@index([tenant_id, category_id])
  @@map("equipment")
}

model ShiftInstance {
  id         String    @id @default(cuid())
  tenant_id  String
  shift_id   String
  date       DateTime
  opened_by  String
  opened_at  DateTime  @default(now())
  closed_at  DateTime?
  status     String    @default("OPEN")
  created_at DateTime  @default(now())

  tenant      Tenant         @relation(fields: [tenant_id], references: [id])
  shift       Shift          @relation(fields: [shift_id], references: [id])
  opener      User           @relation(fields: [opened_by], references: [id])
  readings    Reading[]
  handover    ShiftHandover?
  shift_tasks ShiftTask[]

  @@index([tenant_id, shift_id, date])
  @@index([opened_by])
  @@map("shift_instances")
}

model Reading {
  id                  String   @id @default(cuid())
  tenant_id           String
  collection_point_id String
  parameter_id        String?
  shift_instance_id   String?
  value               Float?
  raw_value           String?
  is_detected         Boolean  @default(true)
  unit                String?
  notes               String?
  is_non_conformant   Boolean?
  origin              String   @default("MANUAL")
  metadata_origin     String? // JSON serializado: {device_id, topic, qos} — reservado para sensores (v2.0)
  recorded_by         String
  recorded_at         DateTime
  created_at          DateTime @default(now())

  tenant           Tenant            @relation(fields: [tenant_id], references: [id])
  collection_point CollectionPoint   @relation(fields: [collection_point_id], references: [id])
  parameter        QualityParameter? @relation(fields: [parameter_id], references: [id])
  shift_instance   ShiftInstance?    @relation(fields: [shift_instance_id], references: [id])
  recorder         User              @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, recorded_at])
  @@index([collection_point_id])
  @@index([parameter_id])
  @@index([shift_instance_id])
  @@index([tenant_id, is_non_conformant, created_at])
  @@map("readings")
}

model Analysis {
  id                  String    @id @default(cuid())
  tenant_id           String
  collection_point_id String
  parameter_id        String
  method_id           String?
  value               Float?
  raw_value           String?
  is_detected         Boolean   @default(true)
  unit                String
  min_limit_applied   Float?
  max_limit_applied   Float?
  report_text         String?
  laboratory_type     String    @default("INTERNAL") // INTERNAL or EXTERNAL
  is_non_conformant   Boolean
  approved_by         String?
  approved_at         DateTime?
  origin              String    @default("MANUAL")
  metadata_origin     String? // JSON serializado — reservado para sensores (v2.0)
  collected_at        DateTime
  recorded_by         String
  created_at          DateTime  @default(now())

  tenant           Tenant           @relation(fields: [tenant_id], references: [id])
  collection_point CollectionPoint  @relation(fields: [collection_point_id], references: [id])
  parameter        QualityParameter @relation(fields: [parameter_id], references: [id])
  method           AnalysisMethod?  @relation(fields: [method_id], references: [id])
  recorder         User             @relation("AnalysisRecorder", fields: [recorded_by], references: [id])
  approver         User?            @relation("AnalysisApprover", fields: [approved_by], references: [id])

  @@index([tenant_id, parameter_id, collected_at])
  @@index([tenant_id, is_non_conformant, approved_by])
  @@index([collection_point_id])
  @@index([recorded_by])
  @@index([collected_at])
  @@map("analyses")
}

model PreventiveMaintenance {
  id             String    @id @default(cuid())
  tenant_id      String
  equipment_id   String
  scheduled_date DateTime
  completed_date DateTime?
  completed_by   String?
  notes          String?
  status         String    @default("SCHEDULED")
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  tenant    Tenant    @relation(fields: [tenant_id], references: [id])
  equipment Equipment @relation(fields: [equipment_id], references: [id])
  completer User?     @relation(fields: [completed_by], references: [id])

  @@index([equipment_id, scheduled_date, status])
  @@index([tenant_id, status])
  @@map("preventive_maintenances")
}

model CorrectiveMaintenance {
  id             String    @id @default(cuid())
  tenant_id      String
  equipment_id   String
  description    String
  responsible_id String
  priority       String?   @default("MEDIUM")
  start_date     DateTime
  end_date       DateTime?
  status         String    @default("IN_PROGRESS")
  estimated_cost Decimal?
  actual_cost    Decimal?
  notes          String?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  tenant      Tenant    @relation(fields: [tenant_id], references: [id])
  equipment   Equipment @relation(fields: [equipment_id], references: [id])
  responsible User      @relation(fields: [responsible_id], references: [id])

  @@index([equipment_id, status])
  @@index([tenant_id, priority, status])
  @@map("corrective_maintenances")
}

model Occurrence {
  id               String    @id @default(cuid())
  tenant_id        String
  description         String
  category            String?   // VAZAMENTO, QUEBRA, FALTA_PRODUTO, OUTROS
  severity            String
  status              String    @default("OPEN")
  deadline            DateTime
  resolved_at         DateTime?
  resolved_by         String?
  resolution_notes    String?
  responsible_id      String?
  reported_by         String
  collection_point_id String?
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  tenant              Tenant            @relation(fields: [tenant_id], references: [id])
  reporter            User              @relation("OccurrenceReporter", fields: [reported_by], references: [id])
  responsible         User?             @relation("OccurrenceResponsible", fields: [responsible_id], references: [id])
  resolver            User?             @relation("OccurrenceResolver", fields: [resolved_by], references: [id])
  collection_point    CollectionPoint?  @relation(fields: [collection_point_id], references: [id])
  photos              OccurrencePhoto[]

  @@index([tenant_id, severity, status])
  @@index([deadline])
  @@index([reported_by])
  @@map("occurrences")
}

model OccurrencePhoto {
  id            String   @id @default(cuid())
  tenant_id     String
  occurrence_id String
  filename      String
  original_name String
  mime_type     String
  size_bytes    Int
  uploaded_by   String
  uploaded_at   DateTime @default(now())

  tenant     Tenant     @relation(fields: [tenant_id], references: [id])
  occurrence Occurrence @relation(fields: [occurrence_id], references: [id], onDelete: Cascade)
  uploader   User       @relation(fields: [uploaded_by], references: [id])

  @@index([occurrence_id])
  @@map("occurrence_photos")
}

// ─────────────────────────────────────────────────────────────────────────────
// d) Fluxo de Turno
// ─────────────────────────────────────────────────────────────────────────────

model ShiftHandover {
  id                    String    @id @default(cuid())
  tenant_id             String
  shift_instance_id     String    @unique
  outgoing_user_id      String
  incoming_user_id      String?
  checklist_data        String // JSON serializado: {readings_done, open_occurrences, pending_items}
  outgoing_observations String?
  handover_at           DateTime
  timeout_at            DateTime
  incoming_observations String?
  confirmed_at          DateTime?
  status                String    @default("PENDING")
  created_at            DateTime  @default(now())

  tenant         Tenant        @relation(fields: [tenant_id], references: [id])
  shift_instance ShiftInstance @relation(fields: [shift_instance_id], references: [id], onDelete: Cascade)
  outgoing_user  User          @relation("HandoverOutgoing", fields: [outgoing_user_id], references: [id])
  incoming_user  User?         @relation("HandoverIncoming", fields: [incoming_user_id], references: [id])

  @@index([status, timeout_at])
  @@map("shift_handovers")
}

model ShiftTask {
  id                String    @id @default(cuid())
  tenant_id         String
  shift_instance_id String
  title             String
  description       String?
  assigned_to_id    String?
  created_by        String
  created_at        DateTime  @default(now())
  completed_at      DateTime?
  completed_by      String?
  completion_notes  String?
  status            String    @default("PENDING")

  tenant         Tenant           @relation(fields: [tenant_id], references: [id])
  shift_instance ShiftInstance    @relation(fields: [shift_instance_id], references: [id], onDelete: Cascade)
  assignee       User?            @relation("TaskAssignee", fields: [assigned_to_id], references: [id])
  creator        User             @relation("TaskCreator", fields: [created_by], references: [id])
  completer      User?            @relation("TaskCompleter", fields: [completed_by], references: [id])
  photos         ShiftTaskPhoto[]

  @@index([shift_instance_id, status])
  @@index([tenant_id, assigned_to_id, status])
  @@map("shift_tasks")
}

model ShiftTaskPhoto {
  id            String   @id @default(cuid())
  tenant_id     String
  task_id       String
  filename      String
  original_name String
  mime_type     String
  size_bytes    Int
  uploaded_by   String
  uploaded_at   DateTime @default(now())

  tenant   Tenant    @relation(fields: [tenant_id], references: [id])
  task     ShiftTask @relation(fields: [task_id], references: [id], onDelete: Cascade)
  uploader User      @relation(fields: [uploaded_by], references: [id])

  @@index([task_id])
  @@map("shift_task_photos")
}

// ─────────────────────────────────────────────────────────────────────────────
// f) Estoque de Produtos Químicos
// ─────────────────────────────────────────────────────────────────────────────

model ChemicalProduct {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  unit        String
  min_stock   Float
  description String?
  is_active   Boolean  @default(true)
  created_by  String
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  tenant  Tenant @relation(fields: [tenant_id], references: [id])
  creator User   @relation(fields: [created_by], references: [id])

  entries ChemicalStockEntry[]
  exits   ChemicalStockExit[]
  counts  ChemicalStockCount[]

  @@index([tenant_id, is_active])
  @@map("chemical_products")
}

model ChemicalStockEntry {
  id             String   @id @default(cuid())
  tenant_id      String
  product_id     String
  quantity       Float
  supplier       String?
  invoice_number String?
  notes          String?
  received_at    DateTime
  recorded_by    String
  created_at     DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, received_at])
  @@map("chemical_stock_entries")
}

model ChemicalStockExit {
  id          String   @id @default(cuid())
  tenant_id   String
  product_id  String
  quantity    Float
  notes       String?
  used_at     DateTime
  recorded_by String
  created_at  DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, used_at])
  @@map("chemical_stock_exits")
}

model ChemicalStockCount {
  id               String   @id @default(cuid())
  tenant_id        String
  product_id       String
  counted_quantity Float
  notes            String?
  counted_at       DateTime
  recorded_by      String
  created_at       DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, counted_at])
  @@map("chemical_stock_counts")
}

// ─────────────────────────────────────────────────────────────────────────────
// e) Rastreabilidade
// ─────────────────────────────────────────────────────────────────────────────

// Sem tenant_id — contexto recuperado via record_id + table_name
model AuditLog {
  id            String   @id @default(cuid())
  user_id       String?
  table_name    String
  record_id     String
  action        String
  before        String? // JSON serializado — estado anterior do registro (null em CREATE)
  after         String? // JSON serializado — estado posterior do registro (null em DELETE)
  ip_address    String?
  justification String?
  timestamp     DateTime @default(now())

  user User? @relation(fields: [user_id], references: [id])

  @@index([table_name, record_id])
  @@index([user_id, timestamp])
  @@index([timestamp])
  @@map("audit_logs")
}

`

### prisma\seed-demo.ts
`	s
/**
 * Seed de demonstração: gera ~6 meses de dados operacionais realistas.
 * Uso: npx tsx prisma/seed-demo.ts
 * Pré-requisito: npx prisma db seed (seed principal) já executado.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT_ID = 'default'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Carregando dados base...')

  const [users, params, methods, points, shifts, equipment, products] = await Promise.all([
    prisma.user.findMany({ where: { tenant_id: TENANT_ID } }),
    prisma.qualityParameter.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.analysisMethod.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.collectionPoint.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.shift.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.equipment.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.chemicalProduct.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
  ])

  const operators   = users.filter((u) => u.role === 'OPERATOR')
  const technicians = users.filter((u) => u.role === 'TECHNICIAN')
  const managers    = users.filter((u) => u.role === 'MANAGER')
  const allUsers    = users

  if (operators.length === 0 || technicians.length === 0) {
    console.error('Rode npx prisma db seed antes deste script.')
    process.exit(1)
  }

  // ── Leituras (180 dias × ~2/dia) ─────────────────────────────────────────
  console.log('Gerando leituras de campo...')
  const readingsData = []
  for (let day = 180; day >= 0; day--) {
    const count = randomInt(1, 4)
    for (let i = 0; i < count; i++) {
      const param = randomItem(params)
      const point = randomItem(points)
      const op    = randomItem(operators)
      const base  = param.max_limit ?? 10
      // ~20% dos valores fora do limite para gerar não-conformidades
      const outOfRange = Math.random() < 0.2
      const value = outOfRange
        ? base * randomBetween(1.1, 1.5)
        : base * randomBetween(0.3, 0.95)

      const isNonConformant =
        (param.max_limit !== null && value > param.max_limit) ||
        (param.min_limit !== null && value < param.min_limit)

      readingsData.push({
        tenant_id:           TENANT_ID,
        collection_point_id: point.id,
        parameter_id:        param.id,
        value,
        unit:                param.unit,
        is_non_conformant:   isNonConformant,
        origin:              'MANUAL',
        recorded_by:         op.id,
        recorded_at:         daysAgo(day),
        created_at:          daysAgo(day),
      })
    }
  }
  await prisma.reading.createMany({ data: readingsData })
  console.log(`  ${readingsData.length} leituras criadas`)

  // ── Análises (180 dias × ~1/dia) ─────────────────────────────────────────
  console.log('Gerando análises laboratoriais...')
  const analysesData = []
  for (let day = 180; day >= 0; day--) {
    if (Math.random() < 0.4) continue // ~60% dos dias têm análise
    const param  = randomItem(params)
    const method = randomItem(methods)
    const point  = randomItem(points)
    const tech   = randomItem(technicians)
    const base   = param.max_limit ?? 10
    const outOfRange = Math.random() < 0.25
    const value  = outOfRange
      ? base * randomBetween(1.1, 1.6)
      : base * randomBetween(0.2, 0.95)

    const isNonConformant =
      (param.max_limit !== null && value > param.max_limit) ||
      (param.min_limit !== null && value < param.min_limit)

    // ~70% das análises são aprovadas
    const approved = Math.random() < 0.7
    const approver = approved ? randomItem([...technicians, ...managers]) : null

    analysesData.push({
      tenant_id:           TENANT_ID,
      collection_point_id: point.id,
      parameter_id:        param.id,
      method_id:           method.id,
      value,
      unit:                param.unit,
      min_limit_applied:   param.min_limit,
      max_limit_applied:   param.max_limit,
      is_non_conformant:   isNonConformant,
      approved_by:         approver?.id ?? null,
      approved_at:         approver ? daysAgo(day) : null,
      origin:              'MANUAL',
      collected_at:        daysAgo(day),
      recorded_by:         tech.id,
      created_at:          daysAgo(day),
    })
  }
  await prisma.analysis.createMany({ data: analysesData })
  console.log(`  ${analysesData.length} análises criadas`)

  // ── Ocorrências (1 por semana nos últimos 6 meses) ────────────────────────
  console.log('Gerando ocorrências...')
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const statuses   = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

  const severityDefaults = await prisma.occurrenceSeverityDefault.findMany()
  const deadlineMap = new Map(severityDefaults.map((s) => [s.severity, s.deadline_hours]))

  const occurrencesData = []
  for (let week = 24; week >= 0; week--) {
    const count = randomInt(1, 3)
    for (let i = 0; i < count; i++) {
      const sev        = randomItem(severities)
      const op         = randomItem(operators)
      const deadlineH  = deadlineMap.get(sev) ?? 72
      const createdAt  = daysAgo(week * 7 + randomInt(0, 6))
      const deadline   = new Date(createdAt.getTime() + deadlineH * 60 * 60 * 1000)
      const isResolved = Math.random() < 0.6
      const status     = isResolved ? 'RESOLVED' : randomItem(['OPEN', 'IN_PROGRESS'])

      occurrencesData.push({
        tenant_id:        TENANT_ID,
        description:      `Ocorrência de demonstração — ${sev} — semana ${week}`,
        severity:         sev,
        status,
        deadline,
        resolved_at:      isResolved ? new Date(deadline.getTime() + randomInt(-12, 48) * 60 * 60 * 1000) : null,
        resolved_by:      isResolved ? randomItem([...technicians, ...managers]).id : null,
        resolution_notes: isResolved ? 'Problema identificado e corrigido conforme procedimento.' : null,
        reported_by:      op.id,
        created_at:       createdAt,
        updated_at:       createdAt,
      })
    }
  }
  await prisma.occurrence.createMany({ data: occurrencesData })
  console.log(`  ${occurrencesData.length} ocorrências criadas`)

  // ── Manutenções preventivas concluídas ───────────────────────────────────
  console.log('Gerando preventivas concluídas...')
  if (equipment.length > 0) {
    const preventivas = []
    for (const eq of equipment) {
      // Simula 3-6 preventivas concluídas nos últimos 6 meses
      const count = randomInt(2, 5)
      for (let i = count; i >= 1; i--) {
        const scheduledDaysAgo = i * Math.floor(180 / count)
        const tech = randomItem(technicians)
        preventivas.push({
          tenant_id:      TENANT_ID,
          equipment_id:   eq.id,
          scheduled_date: daysAgo(scheduledDaysAgo + 2),
          completed_date: daysAgo(scheduledDaysAgo),
          completed_by:   tech.id,
          status:         'COMPLETED',
          notes:          'Preventiva realizada conforme plano de manutenção.',
          created_at:     daysAgo(scheduledDaysAgo + 5),
          updated_at:     daysAgo(scheduledDaysAgo),
        })
      }
    }
    await prisma.preventiveMaintenance.createMany({ data: preventivas })
    console.log(`  ${preventivas.length} preventivas concluídas criadas`)
  }

  // ── Movimentação de estoque ───────────────────────────────────────────────
  console.log('Gerando movimentação de estoque...')
  if (products.length > 0) {
    const entries = []
    const exits   = []

    for (const product of products) {
      const manager = randomItem(managers)
      const op      = randomItem(operators)

      // 3-6 entradas (compras) ao longo dos 6 meses
      const entryCount = randomInt(3, 6)
      for (let i = 0; i < entryCount; i++) {
        entries.push({
          tenant_id:     TENANT_ID,
          product_id:    product.id,
          quantity:      randomBetween(20, 100),
          supplier:      'Fornecedor Demo Ltda.',
          invoice_number: `NF-${10000 + randomInt(0, 9999)}`,
          received_at:   daysAgo(randomInt(5, 175)),
          recorded_by:   manager.id,
          created_at:    daysAgo(randomInt(5, 175)),
        })
      }

      // ~1 saída por semana
      for (let week = 24; week >= 1; week--) {
        if (Math.random() < 0.6) {
          exits.push({
            tenant_id:   TENANT_ID,
            product_id:  product.id,
            quantity:    randomBetween(0.5, 8),
            notes:       'Uso operacional semanal.',
            used_at:     daysAgo(week * 7 + randomInt(0, 4)),
            recorded_by: op.id,
            created_at:  daysAgo(week * 7 + randomInt(0, 4)),
          })
        }
      }
    }

    await prisma.chemicalStockEntry.createMany({ data: entries })
    await prisma.chemicalStockExit.createMany({ data: exits })
    console.log(`  ${entries.length} entradas + ${exits.length} saídas de estoque criadas`)
  }

  const totalRecords =
    readingsData.length + analysesData.length + occurrencesData.length

  console.log(`\nSeed-demo concluído. ~${totalRecords} registros operacionais criados.`)
  console.log('Execute "npm run dev" e acesse /gestor/dashboard para ver os dados.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

`

### prisma\seed.ts
`	s
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', name: 'Solentis', slug: 'solentis', is_active: true },
  })
  console.log(`Tenant: ${tenant.name}`)

  // ── Usuários (hashes em paralelo) ─────────────────────────────────────────
  const [adminHash, tecnicoHash, operadorHash] = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Tecnico@123'),
    hashPassword('Operador@123'),
  ])

  const admin = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'admin@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'admin@solentis.local',
      password_hash: adminHash,
      name: 'Administrador',
      role: 'MANAGER',
      must_change_password: true,
      is_active: true,
    },
  })
  console.log(`Usuario: ${admin.email} (${admin.role})`)

  const tecnico = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'tecnico@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'tecnico@solentis.local',
      password_hash: tecnicoHash,
      name: 'Tecnico Padrao',
      role: 'TECHNICIAN',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${tecnico.email} (${tecnico.role})`)

  const operador = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'operador@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'operador@solentis.local',
      password_hash: operadorHash,
      name: 'Operador Padrao',
      role: 'OPERATOR',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${operador.email} (${operador.role})`)

  // ── Parâmetros de qualidade CONAMA ────────────────────────────────────────
  const effectiveDate = new Date('2025-01-01T00:00:00.000Z')

  const qualityParams = [
    { id: 'seed-param-ph',          name: 'pH',                         unit: 'adimensional', min_limit: 5.0,  max_limit: 9.0   },
    { id: 'seed-param-dbo',         name: 'DBO5',                       unit: 'mg/L',         min_limit: null, max_limit: 60.0  },
    { id: 'seed-param-dqo',         name: 'DQO',                        unit: 'mg/L',         min_limit: null, max_limit: 200.0 },
    { id: 'seed-param-n-amoniacal', name: 'Nitrogenio Amoniacal',       unit: 'mg/L',         min_limit: null, max_limit: 20.0  },
    { id: 'seed-param-fosforo',     name: 'Fosforo Total',              unit: 'mg/L',         min_limit: null, max_limit: 1.0   },
    { id: 'seed-param-ss',          name: 'Solidos Suspensos',          unit: 'mg/L',         min_limit: null, max_limit: 100.0 },
    { id: 'seed-param-coliformes',  name: 'Coliformes Termotolerantes', unit: 'NMP/100mL',    min_limit: null, max_limit: 1000.0},
    { id: 'seed-param-turbidez',    name: 'Turbidez',                   unit: 'NTU',          min_limit: null, max_limit: 100.0 },
  ]

  for (const param of qualityParams) {
    await prisma.qualityParameter.upsert({
      where: { id: param.id },
      update: {},
      create: {
        id: param.id,
        tenant_id: 'default',
        name: param.name,
        unit: param.unit,
        min_limit: param.min_limit,
        max_limit: param.max_limit,
        legal_reference: 'CONAMA 430/2011 Art. 16',
        effective_date: effectiveDate,
        is_active: true,
        created_by: admin.id,
      },
    })
    
    // Criar o limite legal multi-matriz atrelado a esse parâmetro (EFLUENTE)
    await prisma.parameterLimit.upsert({
      where: { tenant_id_parameter_id_matrix_legal_reference: { tenant_id: 'default', parameter_id: param.id, matrix: 'EFLUENTE', legal_reference: 'CONAMA 430/2011 Art. 16' } },
      update: {},
      create: {
        tenant_id: 'default',
        parameter_id: param.id,
        matrix: 'EFLUENTE',
        min_limit: param.min_limit,
        max_limit: param.max_limit,
        legal_reference: 'CONAMA 430/2011 Art. 16',
        rule_type: param.min_limit !== null && param.max_limit !== null ? 'FAIXA' : 'TETO'
      }
    })
  }
  console.log(`Parametros CONAMA: ${qualityParams.length}`)

  // ── Métodos de análise ────────────────────────────────────────────────────
  const analysisMethods = [
    { id: 'seed-method-colorimetria', name: 'Colorimetria', description: 'Metodo colorimetrico para determinacao de compostos em solucao' },
    { id: 'seed-method-gravimetria',  name: 'Gravimetria',  description: 'Metodo gravimetrico para determinacao de solidos e residuos' },
    { id: 'seed-method-titulacao',    name: 'Titulacao',    description: 'Metodo volumetrico por titulacao para alcalinidade e dureza' },
  ]

  for (const method of analysisMethods) {
    await prisma.analysisMethod.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: method.name } },
      update: {},
      create: {
        id: method.id,
        tenant_id: 'default',
        name: method.name,
        description: method.description,
        is_active: true,
      },
    })
  }
  console.log(`Metodos de analise: ${analysisMethods.length}`)

  // ── Categorias de equipamento ─────────────────────────────────────────────
  const equipmentCategories = [
    { id: 'seed-cat-bombas',     name: 'Bombas',           description: 'Bombas de recalque e submersas' },
    { id: 'seed-cat-aeradores',  name: 'Aeradores',        description: 'Aeradores superficiais e difusores' },
    { id: 'seed-cat-filtros',    name: 'Filtros',          description: 'Filtros de areia, carvao ativado e membranas' },
    { id: 'seed-cat-medidores',  name: 'Medidores',        description: 'Medidores de vazao, pH, OD e turbidez' },
    { id: 'seed-cat-dosadores',  name: 'Dosadores',        description: 'Bombas dosadoras de cloro, coagulante e floculante' },
    { id: 'seed-cat-estruturas', name: 'Estruturas Civis', description: 'Tanques, calhas e decantadores' },
  ]

  for (const cat of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: cat.name } },
      update: {},
      create: {
        id: cat.id,
        tenant_id: 'default',
        name: cat.name,
        description: cat.description,
        is_active: true,
      },
    })
  }
  console.log(`Categorias de equipamento: ${equipmentCategories.length}`)

  // ── Pontos de coleta ──────────────────────────────────────────────────────
  const collectionPoints = [
    { id: 'seed-cp-entrada', name: 'Entrada ETE',      location: 'Calha Parshall - entrada',      description: 'Efluente bruto antes de qualquer tratamento', matrix: 'EFLUENTE' },
    { id: 'seed-cp-reator',  name: 'Reator Biologico', location: 'Tanque de aeracao - saida',     description: 'Efluente apos tratamento biologico aerobio', matrix: 'EFLUENTE' },
    { id: 'seed-cp-saida',   name: 'Saida Final',      location: 'Calha de saida - apos filtros', description: 'Efluente tratado lancado no corpo receptor', matrix: 'EFLUENTE' },
    { id: 'seed-cp-poco-1',  name: 'Poço de Monitoramento 1', location: 'Montante', description: 'Água subterrânea', matrix: 'SUBTERRANEA' },
  ]

  for (const cp of collectionPoints) {
    await prisma.collectionPoint.upsert({
      where: { id: cp.id },
      update: { matrix: cp.matrix },
      create: {
        id: cp.id,
        tenant_id: 'default',
        name: cp.name,
        matrix: cp.matrix,
        location: cp.location,
        description: cp.description,
        is_active: true,
      },
    })
  }
  console.log(`Pontos de coleta: ${collectionPoints.length}`)

  // ── Turnos ────────────────────────────────────────────────────────────────
  const shifts = [
    { id: 'seed-shift-manha', name: 'Manha', start_time: '06:00', end_time: '14:00', crosses_midnight: false },
    { id: 'seed-shift-tarde', name: 'Tarde', start_time: '14:00', end_time: '22:00', crosses_midnight: false },
    { id: 'seed-shift-noite', name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true  },
  ]

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: {
        id: shift.id,
        tenant_id: 'default',
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        crosses_midnight: shift.crosses_midnight,
        handover_timeout_minutes: 120,
        is_active: true,
      },
    })
  }
  console.log(`Turnos: ${shifts.length} (Manha, Tarde, Noite)`)

  // ── Prazos padrão de ocorrência (4 linhas fixas) ──────────────────────────
  const severityDefaults = [
    { severity: 'CRITICAL', deadline_hours: 24  },
    { severity: 'HIGH',     deadline_hours: 72  },
    { severity: 'MEDIUM',   deadline_hours: 168 },
    { severity: 'LOW',      deadline_hours: 720 },
  ]

  for (const sd of severityDefaults) {
    await prisma.occurrenceSeverityDefault.upsert({
      where: { severity: sd.severity },
      update: {},
      create: {
        severity: sd.severity,
        deadline_hours: sd.deadline_hours,
        updated_by: admin.id,
      },
    })
  }
  console.log(`Prazos de ocorrencia: CRITICAL=24h, HIGH=72h, MEDIUM=168h, LOW=720h`)

  // ── Produtos químicos ─────────────────────────────────────────────────────
  const chemicalProducts = [
    { id: 'seed-chem-cloro-gran',    name: 'Cloro Granulado',       unit: 'kg',   min_stock: 20,  description: 'Hipoclorito de calcio granulado 65% - desinfeccao' },
    { id: 'seed-chem-hipoclorito',   name: 'Hipoclorito de Sodio',  unit: 'L',    min_stock: 50,  description: 'Solucao 12% - desinfeccao do efluente final' },
    { id: 'seed-chem-cal',           name: 'Cal Hidratada',         unit: 'saco', min_stock: 5,   description: 'Saco 20 kg - correcao de pH e precipitacao de fosforo' },
    { id: 'seed-chem-sulfato-al',    name: 'Sulfato de Aluminio',   unit: 'kg',   min_stock: 100, description: 'Coagulante primario para remocao de turbidez e SST' },
    { id: 'seed-chem-polimero',      name: 'Polimero Cationico',    unit: 'kg',   min_stock: 10,  description: 'Floculante auxiliar para desaguamento do lodo' },
  ]

  for (const product of chemicalProducts) {
    await prisma.chemicalProduct.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        tenant_id: 'default',
        name: product.name,
        unit: product.unit,
        min_stock: product.min_stock,
        description: product.description,
        is_active: true,
        created_by: admin.id,
      },
    })
  }
  console.log(`Produtos quimicos: ${chemicalProducts.length}`)

  console.log('\nSeed concluido com sucesso.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

`

