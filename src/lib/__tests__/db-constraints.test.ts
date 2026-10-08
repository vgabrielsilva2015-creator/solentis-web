/**
 * T-19 — índices e regras de domínio no banco.
 *
 * 1. Toda regra CHECK aceita todos os valores que o app grava (senão o app quebra
 *    com erro 500 depois do deploy). As listas do app são lidas do código-fonte.
 * 2. Toda regra NOT VALID tem o VALIDATE correspondente e entra na conferência
 *    prévia (scripts/ops/t19-preflight.sql).
 * 3. Índice criado por migration precisa estar no schema.prisma (senão o próximo
 *    `migrate dev` gera um DROP INDEX) — exceto os índices parciais da lista abaixo.
 * 4. Migration com CONCURRENTLY tem um comando só (não roda dentro de transação).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8')
const MIG_DIR = join(ROOT, 'prisma/migrations')
const migrations = readdirSync(MIG_DIR).filter((d) => statSync(join(MIG_DIR, d)).isDirectory()).sort()
const migSql = (d: string) => readFileSync(join(MIG_DIR, d, 'migration.sql'), 'utf-8')
const semComentarios = (sql: string) => sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')

const CHECKS_SQL = migSql('20261007070000_domain_checks')
const VALIDATE_SQL = migSql('20261007070100_domain_checks_validate')
const PREFLIGHT_SQL = read('scripts/ops/t19-preflight.sql')

/** Valores aceitos por uma regra `"col" IN (...)` da tabela. */
function permitidos(tabela: string, coluna: string): string[] {
  const re = new RegExp(`ALTER TABLE "${tabela}" ADD CONSTRAINT "chk_${tabela}_${coluna}" CHECK \\(([^\\n]*)\\) NOT VALID;`)
  const m = re.exec(CHECKS_SQL)
  if (!m) throw new Error(`regra chk_${tabela}_${coluna} não encontrada`)
  return [...m[1].matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
}

/** Literais de um tipo união do src/types (ex.: export type Role = 'A' | 'B'). */
function tipo(nome: string): string[] {
  const src = read('src/types/index.ts')
  const m = new RegExp(`export type ${nome} =([^\\n]*(?:\\n\\s*\\|[^\\n]*)*)`).exec(src)
  if (!m) throw new Error(`tipo ${nome} não encontrado`)
  return [...m[1].matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
}

/** Literais de um trecho do código (z.enum([...]), arrays, uniões de parâmetro). */
function literais(arquivo: string, ancora: RegExp): string[] {
  const src = read(arquivo)
  const m = ancora.exec(src)
  if (!m) throw new Error(`${ancora} não encontrado em ${arquivo}`)
  return [...m[0].matchAll(/'([A-Z_]+)'/g)].map((x) => x[1])
}

describe('regras CHECK aceitam tudo o que o app grava', () => {
  const casos: Array<[string, string, string[]]> = [
    ['users', 'role', tipo('Role')],
    ['users', 'role', literais('src/app/gestor/(sistema)/usuarios/schema.ts', /role:\s*z\.enum\(\[[^\]]*\]/)],
    ['occurrences', 'severity', literais('src/app/operador/ocorrencias/actions.ts', /severity:\s*z\.enum\(\[[^\]]*\]/)],
    ['occurrences', 'type', literais('src/app/operador/ocorrencias/actions.ts', /type:\s*z\.enum\(\[[^\]]*\]/)],
    ['occurrences', 'status', literais('src/app/operador/ocorrencias/actions.ts', /validStatuses = \[[^\]]*\]/)],
    ['occurrences', 'status', tipo('OccurrenceStatus')],
    ['occurrence_severity_defaults', 'severity', tipo('OccurrenceSeverity')],
    ['shift_instances', 'status', tipo('ShiftInstanceStatus')],
    ['shift_handovers', 'status', tipo('HandoverStatus')],
    ['shift_tasks', 'status', tipo('TaskStatus')],
    ['preventive_maintenances', 'status', tipo('MaintenanceStatus')],
    ['corrective_maintenances', 'status', literais('src/app/tecnico/equipamentos/actions.ts', /export async function atualizarStatusCorretiva\([\s\S]*?status:[^\n]*/)],
    ['corrective_maintenances', 'priority', tipo('Priority')],
    ['equipment', 'status', tipo('EquipmentStatus')],
    ['equipment', 'status', literais('src/app/tecnico/equipamentos/actions.ts', /status:\s*z\.enum\(\[[^\]]*\]/)],
    ['readings', 'origin', tipo('DataOrigin')],
    ['analyses', 'origin', tipo('DataOrigin')],
    ['external_analyses', 'origin', tipo('DataOrigin')],
    ['analyses', 'laboratory_type', tipo('LaboratoryType')],
    ['external_analyses', 'status', tipo('ExternalAnalysisStatus')],
    ['monitoring_schedules', 'sample_type', literais('src/lib/monitoring-schedule.ts', /SAMPLE_TYPES = \[[^\]]*\]/)],
    ['monitoring_schedules', 'frequency', literais('src/lib/monitoring-schedule.ts', /FREQUENCIES = \[[^\]]*\]/)],
    ['monitoring_schedules', 'executor_role', ['OPERATOR', 'TECHNICIAN']],
    ['parameter_limits', 'rule_type', tipo('RuleType')],
  ]
  it.each(casos)('%s.%s', (tabela, coluna, valoresDoApp) => {
    expect(valoresDoApp.length).toBeGreaterThan(0)
    const faltando = valoresDoApp.filter((v) => !permitidos(tabela, coluna).includes(v))
    expect(faltando).toEqual([])
  })

  it('a regra recusa de fato o que está fora (sanidade do leitor)', () => {
    expect(permitidos('occurrences', 'status')).not.toContain('CLOSED')
    expect(permitidos('users', 'role')).not.toContain('ADMIN')
  })
})

describe('NOT VALID, VALIDATE e conferência prévia andam juntos', () => {
  const nomes = [...CHECKS_SQL.matchAll(/ADD CONSTRAINT "(chk_\w+)"/g)].map((m) => m[1])
  it('todas as regras entram como NOT VALID (não falham por dado antigo)', () => {
    const linhas = semComentarios(CHECKS_SQL).split('\n').filter((l) => l.includes('ADD CONSTRAINT'))
    expect(linhas.length).toBe(nomes.length)
    for (const l of linhas) expect(l.trim().endsWith('NOT VALID;'), l).toBe(true)
  })
  it('cada regra é validada na migration seguinte e conferida no preflight', () => {
    for (const n of nomes) {
      expect(VALIDATE_SQL, n).toContain(`VALIDATE CONSTRAINT "${n}"`)
      expect(PREFLIGHT_SQL, n).toContain(`'${n}'`)
    }
  })
  it('o preflight só lê', () => {
    expect(semComentarios(PREFLIGHT_SQL)).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE)\b/i)
  })
})

describe('índices das migrations estão no schema.prisma', () => {
  // Índices que o Prisma 5 não expressa (parciais): ficam fora do schema de propósito.
  // Ao rodar `migrate dev --create-only`, apagar do SQL gerado qualquer DROP destes.
  const MANUAIS = new Set(['uniq_shift_instance_ativa', 'uniq_turno_ativo_por_operador'])
  const SCHEMA = read('prisma/schema.prisma')

  function nomesDoSchema(): Set<string> {
    const out = new Set<string>()
    for (const m of SCHEMA.matchAll(/^model\s+\w+\s*\{([\s\S]*?)^\}/gm)) {
      const body = m[1]
      const tabela = /@@map\("([^"]+)"\)/.exec(body)?.[1]
      if (!tabela) continue
      for (const idx of body.matchAll(/@@(index|unique)\(\[([^\]]*)\](?:,\s*map:\s*"([^"]+)")?/g)) {
        const cols = idx[2].split(',').map((c) => c.trim().replace(/\(.*\)$/, ''))
        out.add(idx[3] ?? `${tabela}_${cols.join('_')}_${idx[1] === 'unique' ? 'key' : 'idx'}`)
      }
      for (const linha of body.split('\n')) {
        const f = /^\s+(\w+)\s+\w+.*@unique/.exec(linha)
        if (f) out.add(`${tabela}_${f[1]}_key`)
      }
    }
    return out
  }

  it('todo índice criado pelas migrations da T-19 em diante existe no schema', () => {
    const doSchema = nomesDoSchema()
    const faltando: string[] = []
    for (const d of migrations.filter((x) => x >= '20261007060000')) {
      for (const m of migSql(d).matchAll(/CREATE (?:UNIQUE )?INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?"(\w+)"/g)) {
        if (!doSchema.has(m[1]) && !MANUAIS.has(m[1])) faltando.push(`${d}: ${m[1]}`)
      }
    }
    expect(faltando).toEqual([])
  })

  it('os índices das migrations da T-19 em diante têm nome com até 63 caracteres', () => {
    // acima disso o Postgres corta o nome e ele deixa de bater com o do schema
    for (const d of migrations.filter((x) => x >= '20261007060000')) {
      for (const m of migSql(d).matchAll(/INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?"(\w+)"/g)) {
        expect(m[1].length, m[1]).toBeLessThanOrEqual(63)
      }
    }
  })
})

describe('CONCURRENTLY', () => {
  it('migration com CONCURRENTLY tem um único comando', () => {
    for (const d of migrations) {
      const sql = semComentarios(migSql(d))
      if (!/CONCURRENTLY/i.test(sql)) continue
      expect(sql.split(';').filter((s) => s.trim()).length, d).toBe(1)
    }
  })
})
