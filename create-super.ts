import { PrismaClient } from '@prisma/client'
import { hashPassword } from './src/lib/password'

const prisma = new PrismaClient()

async function main() {
  const superHash = await hashPassword('Super@123')
  const user = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'super@solentis.local' } },
    update: { role: 'SUPER_ADMIN' },
    create: {
      tenant_id: 'default',
      email: 'super@solentis.local',
      password_hash: superHash,
      name: 'Super Administrador',
      role: 'SUPER_ADMIN',
      must_change_password: false,
      is_active: true,
    },
  })
  console.log(`Created: ${user.email}`)
}

main().finally(() => prisma.$disconnect())
