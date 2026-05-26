import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const TENANT_ID = 'default'

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
          tenant_id:      TENANT_ID,
          status:         'SCHEDULED',
          scheduled_date: { lt: today },
          equipment:      { is_active: true },
        },
      }),
      // Análises pendentes de aprovação (qualquer)
      prisma.analysis.count({
        where: { tenant_id: TENANT_ID, approved_by: null },
      }),
      // Corretivas em andamento
      prisma.correctiveMaintenance.count({
        where: { tenant_id: TENANT_ID, status: 'IN_PROGRESS' },
      }),
      // Não-conformidades em aberto (n.c. ainda sem aprovação)
      prisma.analysis.count({
        where: { tenant_id: TENANT_ID, is_non_conformant: true, approved_by: null },
      }),
    ])

  const SHORTCUTS = [
    { title: 'Análises',    desc: 'Registrar ou aprovar análises',          href: '/tecnico/analises'    },
    { title: 'Equipamentos', desc: 'Gerenciar preventivas e corretivas',    href: '/tecnico/equipamentos' },
    { title: 'Ocorrências', desc: 'Acompanhar e fechar ocorrências',        href: '/tecnico/ocorrencias' },
    { title: 'Estoque',     desc: 'Registrar entradas de produtos químicos', href: '/tecnico/estoque'    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">Solentis</span>
            <span className="rounded-full bg-sky-900/60 px-2.5 py-0.5 text-xs font-medium text-sky-400">
              Técnico
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{session.user.name ?? session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

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
    </div>
  )
}
