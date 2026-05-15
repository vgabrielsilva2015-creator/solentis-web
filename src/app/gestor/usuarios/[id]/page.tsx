import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const user = await prisma.user.findUnique({
    where:  { id },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, must_change_password: true,
    },
  })

  if (!user) notFound()

  return <EditForm user={user} />
}
