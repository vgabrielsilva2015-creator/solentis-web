import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Lock, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { mfaMode } from '@/lib/mfa/config'
import { estadoMfa, recuperacaoRestante } from '@/server/mfa/service'

export default async function AdminSegurancaPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  const modo = mfaMode()
  const estado = session.user.id ? await estadoMfa(prisma, session.user.id) : 'none'
  const restantes = estado === 'enabled' && session.user.id ? await recuperacaoRestante(prisma, session.user.id) : 0
  const rotuloEstado = estado === 'enabled' ? 'Ativo' : estado === 'pending' ? 'Cadastro iniciado, não confirmado' : 'Não cadastrado'

  return (
    <main className="px-6 py-8 flex flex-col items-center justify-center gap-8 min-h-[60vh]">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-2" data-testid="cartao-mfa">
        <h2 className="font-semibold">Segundo fator (TOTP)</h2>
        <p className="text-sm">Esta conta: <strong>{rotuloEstado}</strong>{estado === 'enabled' ? ` · ${restantes} código(s) de recuperação` : ''}</p>
        <p className="text-sm text-muted-foreground">Exigência no servidor: <code>{modo}</code> (off = desligado, enroll = quem cadastrou precisa do código, required = ninguém opera sem ele).</p>
        {estado !== 'enabled' && <Link href="/mfa/cadastro" className="text-sm underline">Cadastrar o aplicativo autenticador</Link>}
      </section>
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20">
          <Shield className="h-10 w-10 text-indigo-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Segurança
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este módulo permitirá gerenciar políticas de senha, sessões ativas, 
            logs de tentativas de login suspeitas e configurações de segurança do sistema.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
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
