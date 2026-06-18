import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditPontoForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarPontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ponto = await prisma.collectionPoint.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: { id: true, name: true, location: true, description: true, is_active: true },
  })
  if (!ponto) notFound()
  return <EditPontoForm ponto={ponto} />
}
