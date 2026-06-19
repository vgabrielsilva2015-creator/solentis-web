import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditMetodoForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarMetodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const metodo = await prisma.analysisMethod.findFirst({
    where: { id, tenant_id: (await getTenantId()) },
    select: { id: true, name: true, description: true, pop_content: true, is_active: true, collection_points: true },
  })
  if (!metodo) notFound()
  return <EditMetodoForm metodo={metodo} />
}
