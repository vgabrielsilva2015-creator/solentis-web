import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'
import { getTenantId } from '@/lib/tenant'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const user = await prisma.user.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, must_change_password: true,
    },
  })

  if (!user) notFound()

  return <EditForm user={user} />
}
