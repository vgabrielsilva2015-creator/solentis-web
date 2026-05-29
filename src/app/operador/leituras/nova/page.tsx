import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ReadingForm } from './reading-form'

const TENANT_ID = 'default'

export default async function NovaLeituraPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <ReadingForm collectionPoints={collectionPoints} parameters={parameters} />
    </main>
  )
}
