/**
 * T-09 — as migrations precisam reproduzir o schema.prisma.
 *
 * Checagem estática (sem banco): toda tabela e toda coluna do schema tem que
 * ser criada por alguma migration em prisma/migrations. Foi exatamente isso que
 * quebrou antes do baseline: shift_task_templates e 7 colunas existiam no banco
 * e no schema, mas em nenhuma migration (aplicadas por SQL avulso / db push).
 *
 * A checagem completa (aplicar as migrations num banco vazio e comparar com o
 * schema) roda no CI com Postgres — ver scripts/db/compare-schema.sh e T-28/T-29.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const SCHEMA = readFileSync(join(ROOT, 'prisma/schema.prisma'), 'utf-8')
const MIG_DIR = join(ROOT, 'prisma/migrations')

const migrationDirs = readdirSync(MIG_DIR).filter((d) => statSync(join(MIG_DIR, d)).isDirectory()).sort()
const SQL = migrationDirs.map((d) => readFileSync(join(MIG_DIR, d, 'migration.sql'), 'utf-8')).join('\n')

const MODEL_NAMES = new Set([...SCHEMA.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]))
const ENUM_NAMES = new Set([...SCHEMA.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((m) => m[1]))

interface Model { name: string; table: string; columns: string[] }
function models(): Model[] {
  const out: Model[] = []
  for (const m of SCHEMA.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const body = m[2]
    const table = /@@map\("([^"]+)"\)/.exec(body)?.[1] ?? m[1]
    const columns: string[] = []
    for (const line of body.split('\n')) {
      const f = /^\s+(\w+)\s+(\w+)(\[\])?\??/.exec(line)
      if (!f || line.trim().startsWith('//') || line.trim().startsWith('@@')) continue
      const [, field, type, list] = f
      if (MODEL_NAMES.has(type)) continue // campo de relação, não é coluna
      if (list && MODEL_NAMES.has(type)) continue
      columns.push(/@map\("([^"]+)"\)/.exec(line)?.[1] ?? field)
      void ENUM_NAMES
    }
    out.push({ name: m[1], table, columns })
  }
  return out
}

/** Trechos de SQL que definem colunas da tabela: o CREATE TABLE e os ALTER TABLE ... ADD COLUMN. */
function tableSql(table: string): string {
  const parts: string[] = []
  const create = new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?"${table}" \\(([\\s\\S]*?)\\n\\);`, 'g')
  for (const m of SQL.matchAll(create)) parts.push(m[1])
  const alter = new RegExp(`ALTER TABLE "${table}" ADD COLUMN[^;]*;`, 'g')
  for (const m of SQL.matchAll(alter)) parts.push(m[0])
  return parts.join('\n')
}

describe('migrations reproduzem o schema (T-09)', () => {
  it('existe baseline e lock de provider', () => {
    expect(migrationDirs.some((d) => d.endsWith('_baseline'))).toBe(true)
    expect(existsSync(join(MIG_DIR, 'migration_lock.toml'))).toBe(true)
  })

  it('toda tabela do schema é criada por uma migration', () => {
    const faltando = models().filter((m) => !tableSql(m.table)).map((m) => m.table)
    expect(faltando).toEqual([])
  })

  it('toda coluna do schema é criada por uma migration', () => {
    const faltando: string[] = []
    for (const m of models()) {
      const sql = tableSql(m.table)
      for (const c of m.columns) if (!new RegExp(`"${c}"`).test(sql)) faltando.push(`${m.table}.${c}`)
    }
    expect(faltando).toEqual([])
  })

  it('nenhuma migration usa comandos destrutivos sem revisão explícita', () => {
    // DROP TABLE/COLUMN e TRUNCATE só podem entrar com o marcador "-- revisado: destrutivo"
    const perigosas = migrationDirs.filter((d) => {
      const sql = readFileSync(join(MIG_DIR, d, 'migration.sql'), 'utf-8')
      return /\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE)\b/i.test(sql) && !/--\s*revisado:\s*destrutivo/i.test(sql)
    })
    expect(perigosas).toEqual([])
  })

  it('comentários de migration não têm ";" (alguns executores quebram o script por ";")', () => {
    const ruins = migrationDirs.filter((d) =>
      readFileSync(join(MIG_DIR, d, 'migration.sql'), 'utf-8').split('\n').some((l) => /^\s*--.*;/.test(l)))
    expect(ruins).toEqual([])
  })
})
