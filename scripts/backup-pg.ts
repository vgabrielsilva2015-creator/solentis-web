/**
 * Backup lógico do banco PostgreSQL (Supabase) via Prisma.
 * Exporta TODAS as tabelas para backups/solentis-AAAA-MM-DD-HHmm.json
 *
 * Uso:      npx tsx scripts/backup-pg.ts
 * Restaura: script de restore ainda não escrito — o JSON permite reconstruir
 *           via prisma.<model>.createMany por tabela, respeitando a ordem de FKs.
 *
 * Observação: é um backup de DADOS (não de schema). Para dump físico completo
 * use `pg_dump "$DIRECT_URL"` quando o pg_dump estiver disponível.
 */
import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

// Serializa BigInt e Decimal (Prisma) para string; Date já vira ISO via toJSON
function replacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Prisma.Decimal) return value.toString()
  return value
}

async function main() {
  const ROOT = path.resolve(import.meta.dirname, '..')
  const dir = path.join(ROOT, 'backups')
  await fs.mkdir(dir, { recursive: true })

  const models = Prisma.dmmf.datamodel.models
  const dump: Record<string, unknown[]> = {}
  let totalRows = 0

  for (const m of models) {
    const delegateKey = m.name.charAt(0).toLowerCase() + m.name.slice(1)
    // @ts-expect-error acesso dinâmico ao delegate do model
    const delegate = prisma[delegateKey]
    if (!delegate?.findMany) continue
    try {
      const rows = await delegate.findMany()
      dump[m.name] = rows
      totalRows += rows.length
      console.log(`  ${m.name}: ${rows.length}`)
    } catch (e) {
      // Tabela ausente no banco (drift schema x banco) — pula sem abortar
      console.warn(`  ${m.name}: PULADO (${(e as Error).message.split('\n')[0].slice(0, 60)})`)
    }
  }

  const file = path.join(dir, `solentis-${stamp()}.json`)
  await fs.writeFile(file, JSON.stringify({ takenAt: new Date().toISOString(), tables: dump }, replacer, 0))
  const size = (await fs.stat(file)).size
  console.log(`\nBackup OK: ${file}`)
  console.log(`${models.length} tabelas · ${totalRows} linhas · ${(size / 1024).toFixed(1)} KB`)
}

main()
  .catch((e) => { console.error('Backup FALHOU:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
