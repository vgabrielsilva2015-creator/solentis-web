import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  // Tenant padrão
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id:        'default',
      name:      'Solentis',
      slug:      'solentis',
      is_active: true,
    },
  })
  console.log(`✔ Tenant: ${tenant.name} (id: ${tenant.id})`)

  // Usuário admin seed
  const passwordHash = await hashPassword('Admin@123')
  const admin = await prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: 'default',
        email:     'admin@solentis.local',
      },
    },
    update: {},
    create: {
      tenant_id:            'default',
      email:                'admin@solentis.local',
      password_hash:        passwordHash,
      name:                 'Administrador',
      role:                 'MANAGER',
      must_change_password: true,
      is_active:            true,
    },
  })
  console.log(`✔ Usuário admin: ${admin.email} (role: ${admin.role}, must_change_password: ${admin.must_change_password})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
