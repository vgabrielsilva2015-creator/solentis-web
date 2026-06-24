'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireSuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }
  return session
}

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const PlantaSchema = z.object({
  tenantName:  z.string().min(2, 'Nome da planta muito curto'),
  slug:        z.string().min(2, 'Slug muito curto').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  gestorName:  z.string().min(2, 'Nome do gestor muito curto'),
  gestorEmail: z.string().email('E-mail inválido'),
})

export type PlantaFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  success?:      boolean
  tempPassword?: string
  gestorEmail?:  string
}

export async function criarPlanta(
  _prev: PlantaFormState,
  formData: FormData,
): Promise<PlantaFormState> {
  await requireSuperAdmin()

  const parsed = PlantaSchema.safeParse({
    tenantName:  formData.get('tenantName'),
    slug:        formData.get('slug'),
    gestorName:  formData.get('gestorName'),
    gestorEmail: formData.get('gestorEmail'),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { tenantName, slug, gestorName, gestorEmail } = parsed.data
  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Criar Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: slug,
        }
      })

      // 2. Criar Gestor associado a este Tenant
      await tx.user.create({
        data: {
          tenant_id:            tenant.id,
          name:                 gestorName,
          email:                gestorEmail,
          role:                 'MANAGER',
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        }
      })
    })

    revalidatePath('/admin/plantas')
    return { success: true, tempPassword, gestorEmail }
    
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        const target = e.meta?.target as string[] | string
        if (target && target.includes('slug')) {
          return { fieldErrors: { slug: ['Este slug já está em uso'] } }
        }
        if (target && target.includes('email')) {
          return { fieldErrors: { gestorEmail: ['E-mail já cadastrado'] } }
        }
      }
    }
    console.error('Erro ao criar planta:', e)
    return { error: 'Erro ao criar planta. Tente novamente.' }
  }
}
