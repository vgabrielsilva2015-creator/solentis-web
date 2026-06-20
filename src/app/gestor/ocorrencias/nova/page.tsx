import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { GestorOccurrenceForm } from './occurrence-form'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export default async function NovaOcorrenciaGestorPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const collectionPoints = await prisma.collectionPoint.findMany({
    where: { tenant_id: await getTenantId(), is_active: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' }
  })

  return (
    <main className="p-6 max-w-lg mx-auto space-y-4">
      <div>
        <BackButton href="/gestor/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <GestorOccurrenceForm collectionPoints={collectionPoints} />
    </main>
  )
}
