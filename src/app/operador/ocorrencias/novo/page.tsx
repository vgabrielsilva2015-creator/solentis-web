import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { OccurrenceForm } from './occurrence-form'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export default async function NovaOcorrenciaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const collectionPoints = await prisma.collectionPoint.findMany({
    where: { tenant_id: await getTenantId(), is_active: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' }
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4 pb-24">
      <div>
        <BackButton href="/operador/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <OccurrenceForm collectionPoints={collectionPoints} />
    </main>
  )
}
