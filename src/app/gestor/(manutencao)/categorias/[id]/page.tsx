import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditCategoriaForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const categoria = await prisma.equipmentCategory.findFirst({ where: { id, tenant_id: (await getTenantId()) }, select: { id: true, name: true, description: true, is_active: true },
  })
  if (!categoria) notFound()
  return <EditCategoriaForm categoria={categoria} />
}
