/**
 * T-21 — higiene de segurança.
 * V-11: nenhum arquivo 'use server' exporta função de servidor sem guard.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(process.cwd(), 'src')
function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e)
    if (statSync(f).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(f, acc) }
    else if (/\.tsx?$/.test(e)) acc.push(f)
  }
  return acc
}

describe("V-11: 'use server' só expõe actions", () => {
  it('push-actions exporta só subscribe/unsubscribe, e o envio mora no push-service', () => {
    const actions = readFileSync(join(SRC, 'lib/push-actions.ts'), 'utf-8')
    const nomes = [...actions.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1])
    expect(nomes.sort()).toEqual(['subscribeUser', 'unsubscribeUser'])
    const service = readFileSync(join(SRC, 'lib/push-service.ts'), 'utf-8')
    expect(service).not.toMatch(/^['"]use server['"]/m)
    expect(service).toMatch(/export async function sendPushToRole/)
    expect(service).toMatch(/export async function sendPushToUsers/)
  })

  it("arquivo 'use server' não exporta nada além de funções async (constantes/ funções síncronas viram endpoint ou quebram o build)", () => {
    const ruins: string[] = []
    for (const f of walk(SRC)) {
      const t = readFileSync(f, 'utf-8')
      if (!/^\s*['"]use server['"]/.test(t)) continue
      for (const m of t.matchAll(/^export (?!async function|type |interface |\{)(const|let|var|function|class|enum)\s+(\w+)/gm)) {
        ruins.push(`${relative(SRC, f)}: export ${m[1]} ${m[2]}`)
      }
    }
    expect(ruins).toEqual([])
  })
})

/** Extrai a expressão completa que começa em `z.string(` (inclui a cadeia .min().max()... nas linhas seguintes). */
export function expressoesZString(texto: string): Array<{ pos: number; expr: string }> {
  const out: Array<{ pos: number; expr: string }> = []
  for (const m of texto.matchAll(/\bz\.string\(/g)) {
    let k = m.index!, d = 0
    for (; k < texto.length; k++) {
      const c = texto[k]
      if ('([{'.includes(c)) d++
      else if (')]}'.includes(c)) { d--; if (d < 0) break }
      else if (c === ',' && d === 0) break
    }
    out.push({ pos: m.index!, expr: texto.slice(m.index!, k) })
  }
  return out
}

describe('B-09: todo texto recebido tem tamanho máximo', () => {
  it('cada z.string() tem .max() (ou .length())', () => {
    const sem: string[] = []
    for (const f of walk(SRC)) {
      const t = readFileSync(f, 'utf-8')
      for (const { pos, expr } of expressoesZString(t)) {
        if (/\.(max|length)\(/.test(expr)) continue
        const linha = t.slice(0, pos).split('\n').length
        sem.push(`${relative(SRC, f)}:${linha}  ${expr.replace(/\s+/g, ' ').slice(0, 70)}`)
      }
    }
    expect(sem).toEqual([])
  })
})
