import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditParametroForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarParametroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const parametro = await prisma.qualityParameter.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
    },
  })

  if (!parametro) notFound()

  return <EditParametroForm parametro={parametro} />
}
