import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ReadingForm } from './reading-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovaLeituraPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true, is_field: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/operador/leituras" label="Leituras" />
      <ReadingForm collectionPoints={collectionPoints} parameters={parameters} />
    </main>
  )
}
