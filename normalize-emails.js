const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  console.log("Normalizando emails...")
  const users = await prisma.user.findMany()
  for (const u of users) {
    const lower = u.email.trim().toLowerCase()
    if (u.email !== lower) {
       await prisma.user.update({ where: { id: u.id }, data: { email: lower }})
       console.log(`Updated ${u.email} -> ${lower}`)
    }
  }
  console.log("Pronto!")
}
main().finally(() => prisma.$disconnect())
