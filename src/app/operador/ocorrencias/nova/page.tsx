import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OccurrenceForm } from './occurrence-form'

export default async function NovaOcorrenciaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">Solentis</span>
          <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Operador
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/operador/ocorrencias" className="text-sm text-slate-400 hover:text-slate-200">
            ← Ocorrências
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-semibold">Nova ocorrência</h1>
        </div>

        <OccurrenceForm />
      </main>
    </div>
  )
}
