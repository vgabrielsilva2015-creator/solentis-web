const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function main() {
  const sql = fs.readFileSync('prisma/sql/add_indexes.sql', 'utf8')
  // prisma.$executeRawUnsafe can't execute multiple statements easily in some cases,
  // but let's try splitting them.
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
  for (const stmt of statements) {
    if (stmt.startsWith('--') && !stmt.includes('\n')) continue; // Skip pure comments
    console.log(`Executing: ${stmt.substring(0, 50)}...`)
    await prisma.$executeRawUnsafe(stmt)
  }
  console.log('Indexes added successfully.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
