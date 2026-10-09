/**
 * T-13 — toda movimentação de estoque roda com o produto travado.
 * O teste de concorrência real (10 saídas simultâneas contra Postgres) está no
 * relatório da T-13 e entra no harness de integração da T-28.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules' && !(dir.endsWith('/src') && e === 'test')) walk(full, acc) } // src/test = apoio dos testes (T-28), nunca importado pelo app
    else if (/\.tsx?$/.test(e)) acc.push(full)
  }
  return acc
}

describe('estoque serializado por produto (T-13)', () => {
  it('toda gravação de entrada/saída/contagem acontece depois de lockProduct, na mesma função', () => {
    const faltando: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      const text = readFileSync(f, 'utf-8')
      const re = /(?:prisma|tx)\.chemicalStock(?:Exit|Entry|Count)\.(?:create|createMany|update|updateMany|upsert)\s*\(/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text))) {
        const fnStart = text.lastIndexOf('async function', m.index) // T-30: cobre também a função *Impl por trás do invólucro de medição
        const corpo = text.slice(fnStart, m.index)
        if (!/lockProduct\(tx,/.test(corpo) || m[0].startsWith('prisma.')) {
          faltando.push(`${f.replace(process.cwd() + '/', '')}:${text.slice(0, m.index).split('\n').length}`)
        }
      }
    }
    expect(faltando).toEqual([])
  })

  it('a trava é SELECT … FOR UPDATE filtrado por id e tenant', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/stock-lock.ts'), 'utf-8')
    expect(src).toMatch(/FOR UPDATE/)
    expect(src).toMatch(/tenant_id = \$\{tenantId\}/)
  })
})
