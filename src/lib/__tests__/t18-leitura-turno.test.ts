/**
 * T-18 — P-16 — leitura só entra no turno aberto por quem registrou.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ─── P-16 ────────────────────────────────────────────────────────────────────
describe('P-16: leitura só entra no turno aberto por quem registrou', () => {
  it('sem turno próprio não procura "qualquer turno aberto" da planta', () => {
    const t = semComentarios(src('app/operador/leituras/actions.ts'))
    const buscas = [...t.matchAll(/prisma\.shiftInstance\.findFirst\(\{[\s\S]*?\}\)/g)].map((m) => m[0])
    expect(buscas.length).toBeGreaterThan(0)
    for (const b of buscas) expect(b, b).toMatch(/opened_by:\s*userId/)
    expect(t).toMatch(/shift_instance_id:\s*activeInstance\?\.id \?\? null/)
  })
})
