import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditMetodoForm } from './edit-form'

export default async function EditarMetodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const metodo = await prisma.analysisMethod.findUnique({
    where:  { id },
    select: { id: true, name: true, description: true, is_active: true },
  })
  if (!metodo) notFound()
  return <EditMetodoForm metodo={metodo} />
}
