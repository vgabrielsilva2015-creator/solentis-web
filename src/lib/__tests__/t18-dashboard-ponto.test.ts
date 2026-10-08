/**
 * T-18 — B-06 — filtro de ponto do dashboard do gestor vale para as 3 contagens de ocorrência.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')

// ─── B-06 ────────────────────────────────────────────────────────────────────
describe('B-06: filtro de ponto vale para as 3 contagens de ocorrência', () => {
  it('pointSql fica no WHERE, não dentro de um único FILTER', () => {
    // T-23: a consulta foi para src/server/dashboard/queries.ts
    const t = src('server/dashboard/queries.ts')
    const i = t.indexOf('AS open_total')
    const sql = t.slice(t.lastIndexOf('SELECT', i), t.indexOf('`)', i))
    expect(sql).not.toMatch(/FILTER\s*\([^)]*\$\{ponto\}/)
    expect(sql).toMatch(/FROM occurrences\s+WHERE tenant_id = \$\{tenantId\}\s+\$\{ponto\}/)
  })
})
