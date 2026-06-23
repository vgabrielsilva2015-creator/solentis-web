import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditPontoColetaForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarPontoColetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const ponto = await prisma.collectionPoint.findFirst({
    where: { id, tenant_id: (await getTenantId()) },
    select: {
      id:          true,
      name:        true,
      matrix:      true,
      location:    true,
      description: true,
      is_active:   true,
      is_field:    true,
      is_internal: true,
      is_external: true,
    },
  })

  if (!ponto) notFound()

  return <EditPontoColetaForm ponto={ponto} />
}
