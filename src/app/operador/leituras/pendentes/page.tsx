import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PendentesList } from './pendentes-list'

// T-15: leituras guardadas neste aparelho (fila offline).
export default async function LeiturasPendentesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Leituras guardadas neste aparelho</h1>
      <PendentesList userId={session.user.id} />
    </main>
  )
}
