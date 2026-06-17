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
