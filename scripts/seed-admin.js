const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.argv[2] || 'admin@solentis.com'
  const password = process.argv[3] || 'admin123'
  const passwordHash = await bcrypt.hash(password, 10)

  // 1. Criar tenant SYSTEM se não existir
  let systemTenant = await prisma.tenant.findUnique({ where: { slug: 'system' } })
  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        name: 'Solentis Admin',
        slug: 'system',
      }
    })
    console.log('Criado Tenant SYSTEM:', systemTenant.id)
  }

  // 2. Criar SUPER_ADMIN
  const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } })
  if (!adminUser) {
    await prisma.user.create({
      data: {
        tenant_id: systemTenant.id,
        name: 'Super Admin',
        email: adminEmail,
        role: 'SUPER_ADMIN',
        password_hash: passwordHash,
        must_change_password: false, // Super admin não precisa trocar (para facilitar agora)
        is_active: true,
      }
    })
    console.log(`Super Admin criado com e-mail: ${adminEmail}`)
  } else {
    console.log(`Admin já existe: ${adminEmail}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
