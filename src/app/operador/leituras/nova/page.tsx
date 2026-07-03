import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ReadingForm } from './reading-form'
import { getTenantId } from '@/lib/tenant'


export default async function NovaLeituraPage({
  searchParams,
}: {
  searchParams: Promise<{ point?: string; param?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { point, param } = await searchParams

  const tenantId = await getTenantId()

  const [collectionPoints, parameters, schedules] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: tenantId, is_active: true, is_field: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
    // Cronograma do gestor: quais parâmetros cada ponto deve ter para o OPERADOR
    prisma.monitoringSchedule.findMany({
      where:  { tenant_id: tenantId, is_active: true, executor_role: 'OPERATOR' },
      select: { collection_point_id: true, parameter_id: true },
    }),
  ])

  // Mapa ponto → parâmetros permitidos (só os com parameter_id definido)
  const allowedParams: Record<string, string[]> = {}
  for (const s of schedules) {
    if (!s.collection_point_id || !s.parameter_id) continue
    ;(allowedParams[s.collection_point_id] ??= []).push(s.parameter_id)
  }

  // Fluxo guiado pelo Checklist de Coletas: valida os IDs recebidos por query
  // contra os dados reais (ignora links quebrados/desatualizados).
  const initialCollectionPointId =
    point && collectionPoints.some((cp) => cp.id === point) ? point : ''
  const initialParameterId =
    param && parameters.some((p) => p.id === param) ? param : ''

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/operador/leituras" label="Leituras" />
      <ReadingForm
        collectionPoints={collectionPoints}
        parameters={parameters}
        allowedParams={allowedParams}
        initialCollectionPointId={initialCollectionPointId}
        initialParameterId={initialParameterId}
      />
    </main>
  )
}
