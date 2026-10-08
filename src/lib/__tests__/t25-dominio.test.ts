/**
 * T-25 — camada de domínio de estoque e leituras: as regras vivem em `src/server/<módulo>/service.ts`
 * e as actions ficam finas. Só os módulos já mexidos por outras tarefas (T-13 estoque, T-15/T-18 leituras).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ler = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')
/** Código sem comentários (os comentários citam de propósito o que o arquivo NÃO faz). */
const codigoDe = (p: string) => ler(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Linhas do corpo de uma função assíncrona (chaves balanceadas, pulando o tipo de retorno). */
function linhasDaFuncao(src: string, nome: string): number {
  const ini = src.search(new RegExp(`async function ${nome}\\(`))
  expect(ini, `função ${nome}`).toBeGreaterThanOrEqual(0)
  let k = src.indexOf('(', ini), d = 0
  do { if (src[k] === '(') d++; else if (src[k] === ')') d--; k++ } while (d)
  let a = 0
  while (!(src[k] === '{' && a === 0)) { if (src[k] === '<') a++; else if (src[k] === '>') a--; k++ }
  const i = k; d = 0
  do { if (src[k] === '{') d++; else if (src[k] === '}') d--; k++ } while (d)
  return src.slice(i, k).split('\n').length
}

const MIGRADAS: Array<{ arq: string; funcoes: string[] }> = [
  { arq: 'src/app/operador/estoque/actions.ts', funcoes: ['registrarSaidaImpl', 'registrarContagemImpl'] },
  { arq: 'src/app/gestor/produtos-quimicos/actions.ts', funcoes: ['registrarEntradaImpl'] },
  { arq: 'src/app/operador/leituras/actions.ts', funcoes: ['registrarLeituraImpl'] },
]

describe('actions finas (T-25)', () => {
  it('cada action migrada tem no máximo 40 linhas', () => {
    for (const { arq, funcoes } of MIGRADAS) {
      const src = ler(arq)
      for (const f of funcoes) expect(linhasDaFuncao(src, f), `${arq}#${f}`).toBeLessThanOrEqual(40)
    }
  })

  it('a action não toca no banco nem importa lock/saldo: isso é do serviço', () => {
    for (const { arq } of MIGRADAS) {
      const src = ler(arq)
      const codigo = src.slice(0, src.indexOf('// ─── T-30') > 0 ? src.indexOf('// ─── T-30') : undefined)
      // excluirProduto/criarProduto etc. do módulo de produtos ainda usam o prisma (não foram migrados)
      if (arq.includes('produtos-quimicos')) {
        const impl = codigo.slice(codigo.indexOf('async function registrarEntradaImpl'))
        expect(impl.slice(0, impl.indexOf('export async function excluirProduto'))).not.toMatch(/\bprisma\./)
      } else {
        expect(codigo).not.toMatch(/\bprisma\./)
        expect(codigo).not.toMatch(/lockProduct|saldoAtual|\$transaction/)
      }
    }
  })
})

describe('serviços sem dependência de tela ou sessão (T-25)', () => {
  const SERVICOS = ['src/server/estoque/service.ts', 'src/server/leituras/service.ts']

  it('não importam next/*, auth, sessão nem tenant da sessão', () => {
    for (const arq of SERVICOS) {
      const src = codigoDe(arq)
      expect(src, arq).not.toMatch(/from 'next\//)
      expect(src, arq).not.toMatch(/from '@\/lib\/auth'|from '@\/lib\/tenant'|from '@\/server\/auth\/guards'/)
      expect(src, arq).not.toMatch(/revalidatePath|FormData|getTenantId/)
    }
  })

  it('o schema fica fora do arquivo "use server" (que só exporta funções)', () => {
    for (const arq of ['src/server/estoque/schema.ts', 'src/server/leituras/schema.ts']) {
      expect(codigoDe(arq), arq).not.toMatch(/['"]use server['"]/)
    }
    for (const { arq } of MIGRADAS) expect(ler(arq), arq).not.toMatch(/export const \w+Schema/)
  })

  it('todo serviço recebe tenantId explícito (nada de ler o tenant "por fora")', () => {
    for (const arq of SERVICOS) expect(ler(arq), arq).toMatch(/tenantId: string/)
  })
})
