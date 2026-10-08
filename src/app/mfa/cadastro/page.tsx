import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { estadoMfa, recuperacaoRestante } from '@/server/mfa/service'
import { SignOutButton } from '@/components/sign-out-button'
import { CadastroMfaForm } from './cadastro-form'

export const dynamic = 'force-dynamic'

export default async function CadastroMfaPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN' || !session.user.id) redirect('/login')

  const estado = await estadoMfa(prisma, session.user.id)
  const restantes = estado === 'enabled' ? await recuperacaoRestante(prisma, session.user.id) : 0

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Segundo fator de autenticação</h1>
        <p className="text-sm text-muted-foreground">Aplicativo autenticador (Google Authenticator, Authy, 1Password…) para entrar no painel de administração.</p>
      </header>
      {estado === 'enabled' ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="font-medium">O segundo fator já está ativo nesta conta.</p>
          <p className="text-sm text-muted-foreground">Códigos de recuperação ainda válidos: {restantes}.</p>
          <Link href="/admin/plantas" className="text-sm underline">Voltar ao painel</Link>
        </div>
      ) : (
        <CadastroMfaForm />
      )}
      <div className="flex justify-end"><SignOutButton /></div>
    </main>
  )
}
