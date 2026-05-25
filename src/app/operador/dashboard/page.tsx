import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

const TENANT_ID = 'default'

export default async function OperadorDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email: session.user.email! } },
    select: { id: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openOcorrencias, pendingHandovers] = await Promise.all([
    userRecord
      ? prisma.occurrence.count({
          where: {
            tenant_id:   TENANT_ID,
            reported_by: userRecord.id,
            status:      { in: ['OPEN', 'IN_PROGRESS'] },
          },
        })
      : Promise.resolve(0),
    userRecord
      ? prisma.shiftHandover.count({
          where: {
            tenant_id:   TENANT_ID,
            status:      'PENDING',
            outgoing_user_id: { not: userRecord.id },
            shift_instance: {
              date:      today,
              status:    'HANDOVER_PENDING',
            },
          },
        })
      : Promise.resolve(0),
  ])

  const SHORTCUTS = [
    {
      title: 'Leituras',
      desc:  'Registrar leitura de campo',
      href:  '/operador/leituras',
    },
    {
      title: 'Ocorrências',
      desc:  'Registrar ou acompanhar ocorrências',
      href:  '/operador/ocorrencias',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight">Solentis</span>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Operador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{session.user.name ?? session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Olá, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Operador</p>
        </div>

        {/* Widget de passagens aguardando confirmação */}
        {pendingHandovers > 0 && (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 space-y-1 hover:bg-amber-950/30 transition-colors animate-pulse"
          >
            <p className="text-2xl font-bold text-amber-400">{pendingHandovers}</p>
            <p className="text-xs text-amber-500 leading-snug">
              {pendingHandovers === 1
                ? 'Passagem de turno aguardando sua confirmação'
                : 'Passagens de turno aguardando sua confirmação'}
            </p>
          </Link>
        )}

        {/* Widget de ocorrências abertas */}
        <Link
          href="/operador/ocorrencias"
          className={[
            'block rounded-xl border p-4 space-y-1 hover:bg-slate-800/60 transition-colors',
            openOcorrencias > 0
              ? 'border-amber-900/60 bg-amber-950/20'
              : 'border-slate-800 bg-slate-900',
          ].join(' ')}
        >
          <p className={[
            'text-2xl font-bold',
            openOcorrencias > 0 ? 'text-amber-400' : 'text-slate-200',
          ].join(' ')}>
            {openOcorrencias}
          </p>
          <p className="text-xs text-slate-500 leading-snug">
            {openOcorrencias === 1
              ? 'Ocorrência sua em aberto'
              : 'Ocorrências suas em aberto'}
          </p>
        </Link>

        {/* Atalhos */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
