import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/sign-out-button'

const FEATURES = [
  { title: 'Análises',          desc: 'Registro e histórico de análises laboratoriais' },
  { title: 'Parâmetros',        desc: 'Consulta de limites e métodos analíticos' },
  { title: 'Equipamentos',      desc: 'Visão geral e manutenções programadas' },
  { title: 'Ocorrências',       desc: 'Abertura e acompanhamento de incidentes' },
  { title: 'Pontos de Coleta',  desc: 'Mapa e histórico por ponto' },
  { title: 'Relatórios',        desc: 'Exportação de dados técnicos' },
]

export default async function TecnicoDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
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

      {/* Conteúdo */}
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 text-sm">Painel do Técnico — funcionalidades em desenvolvimento.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2 opacity-70"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-200">{f.title}</h2>
                <span className="text-xs text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">Em breve</span>
              </div>
              <p className="text-xs text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
