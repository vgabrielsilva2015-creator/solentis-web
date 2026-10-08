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
