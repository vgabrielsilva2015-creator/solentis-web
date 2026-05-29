import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OccurrenceForm } from './occurrence-form'

export default async function NovaOcorrenciaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
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
  )
}
