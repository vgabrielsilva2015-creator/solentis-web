import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditCategoriaForm } from './edit-form'

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const categoria = await prisma.equipmentCategory.findUnique({
    where: { id }, select: { id: true, name: true, description: true, is_active: true },
  })
  if (!categoria) notFound()
  return <EditCategoriaForm categoria={categoria} />
}
