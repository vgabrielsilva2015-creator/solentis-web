/**
 * Backup do banco SQLite — copia dev.db para backups/solentis-AAAA-MM-DD.db
 * Uso: npx tsx scripts/backup.ts
 *
 * Restaurar: veja RUNBOOK.md — seção "Backup e Restore".
 */

import fs   from 'fs/promises'
import path from 'path'

const ROOT       = path.resolve(import.meta.dirname, '..')
const SOURCE     = path.join(ROOT, 'prisma', 'dev.db')
const BACKUP_DIR = path.join(ROOT, 'backups')

function dateSuffix(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function main() {
  // Verifica banco de origem
  try {
    await fs.access(SOURCE)
  } catch {
    console.error(`Banco não encontrado: ${SOURCE}`)
    process.exit(1)
  }

  // Cria diretório de backups se não existir
  await fs.mkdir(BACKUP_DIR, { recursive: true })

  const dest = path.join(BACKUP_DIR, `solentis-${dateSuffix()}.db`)
  await fs.copyFile(SOURCE, dest)

  const { size } = await fs.stat(dest)
  const kb = (size / 1024).toFixed(1)
  console.log(`Backup criado: ${dest} (${kb} KB)`)
}

main().catch((err) => {
  console.error('Falha no backup:', err)
  process.exit(1)
})
