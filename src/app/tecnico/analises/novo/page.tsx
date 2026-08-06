import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisForm } from './analysis-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovaAnalisePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters, methods] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true, is_internal: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true, default_method_id: true },
      orderBy: { name: 'asc' },
    }),
    prisma.analysisMethod.findMany({
      where:   { tenant_id: (await getTenantId()), is_active: true },
      select:  { id: true, name: true, pop_content: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/tecnico/analises" label="Análises" />
      <AnalysisForm
        collectionPoints={collectionPoints}
        parameters={parameters}
        methods={methods}
      />
    </main>
  )
}
