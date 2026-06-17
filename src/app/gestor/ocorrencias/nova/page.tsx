import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { GestorOccurrenceForm } from './occurrence-form'

export default async function NovaOcorrenciaGestorPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="p-6 max-w-lg mx-auto space-y-4">
      <div>
        <BackButton href="/gestor/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <GestorOccurrenceForm />
    </main>
  )
}
