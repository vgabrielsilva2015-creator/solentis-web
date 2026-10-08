/** T-28: o apoio dos testes de integração (src/test) nunca entra no código do app. */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'

const src = join(process.cwd(), 'src')
const walk = (dir: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e)
    if (statSync(f).isDirectory()) { if (e !== 'node_modules') walk(f, acc) } else if (/\.tsx?$/.test(e)) acc.push(f)
  }
  return acc
}
const ehTeste = (f: string) => /__tests__|\/src\/test\/|\.test\.tsx?$/.test(f.replace(/\\/g, '/'))

describe('apoio de teste', () => {
  it('nenhum arquivo do app importa @/test/ ou src/test', () => {
    const ofensores = walk(src).filter((f) => !ehTeste(f)).filter((f) => /from ['"](@\/test\/|\.{1,2}\/(\.\.\/)*test\/)/.test(readFileSync(f, 'utf8')))
    expect(ofensores).toEqual([])
  })

  it('o TRUNCATE só existe em src/test/db.ts', () => {
    const ofensores = walk(src).filter((f) => !/\/src\/test\/db\.ts$/.test(f.replace(/\\/g, '/')) && !f.includes('__tests__'))
      .filter((f) => /TRUNCATE\s+TABLE/i.test(readFileSync(f, 'utf8')))
    expect(ofensores).toEqual([])
  })

  it('a configuração de integração só pega *.int.test.ts e a unitária os exclui', () => {
    expect(readFileSync('vitest.integration.config.ts', 'utf8')).toMatch(/src\/\*\*\/\*\.int\.test\.ts/)
    expect(readFileSync('vitest.config.ts', 'utf8')).toMatch(/exclude:.*\.int\.test\.ts/)
    expect(existsSync('src/test/db.ts')).toBe(true)
  })

  it('o CI roda a integração com Postgres de serviço e aplica as migrations do zero', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
    expect(ci).toMatch(/image: postgres:16/)
    expect(ci).toMatch(/prisma migrate deploy/)
    expect(ci).toMatch(/npm run test:integration/)
  })
})
