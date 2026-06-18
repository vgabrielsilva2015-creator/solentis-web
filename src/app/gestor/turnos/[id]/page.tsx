import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditTurnoForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const turno = await prisma.shift.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true, handover_timeout_minutes: true, is_active: true },
  })
  if (!turno) notFound()
  return <EditTurnoForm turno={turno} />
}
