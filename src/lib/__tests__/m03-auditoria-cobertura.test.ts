/**
 * M-03 — Cobertura de auditoria (contrato).
 *
 * Toda server action exportada que grava dados (create/update/delete/upsert em
 * qualquer modelo que não seja o próprio auditLog) precisa chamar `logAudit`,
 * OU estar listada em EXCECOES com um motivo. Assim:
 *  - nenhuma action de escrita some do rastro em silêncio;
 *  - uma action nova força uma decisão explícita (auditar ou justificar a exceção);
 *  - quando uma pendência é resolvida (passa a auditar), ela DEVE sair de EXCECOES
 *    (o teste acusa exceções obsoletas).
 *
 * As entradas "pendente M-03" são o backlog dos lotes seguintes (M-03b…n).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(process.cwd(), 'src')

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(full, acc) }
    else if (/\.ts$/.test(e)) acc.push(full)
  }
  return acc
}
const SERVER_FILES = walk(SRC).filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf-8')))

/** Corpo de cada função exportada (parênteses e chaves balanceados). Igual ao de permissions.test.ts. */
function actions(file: string): Array<{ name: string; body: string }> {
  const s = readFileSync(file, 'utf-8')
  const todas = new Map<string, { exportada: boolean; body: string }>()
  for (const m of s.matchAll(/^(export )?async function (\w+)\s*\(/gm)) {
    let k = m.index! + m[0].length, d = 1
    while (d) { if (s[k] === '(') d++; else if (s[k] === ')') d--; k++ }
    let a = 0
    while (!(s[k] === '{' && a === 0)) { if (s[k] === '<') a++; else if (s[k] === '>') a--; k++ }
    const i = k; d = 1; k++
    while (d) { if (s[k] === '{') d++; else if (s[k] === '}') d--; k++ }
    todas.set(m[2], { exportada: !!m[1], body: s.slice(i, k) })
  }
  const out: Array<{ name: string; body: string }> = []
  for (const [name, f] of todas) {
    if (!f.exportada) continue
    const inv = /medir\('(\w+)',\s*\(\)\s*=>\s*(\w+)\(\.\.\.args\)\)/.exec(f.body)
    if (inv && inv[1] === name && todas.has(inv[2]) && inv[2] === `${name}Impl`) out.push({ name, body: todas.get(inv[2])!.body })
    else out.push({ name, body: f.body })
  }
  return out
}

const chave = (file: string, name: string) =>
  `${relative(SRC, file).replace(/\\/g, '/').replace(/^app\//, '')}#${name}`

/** Grava em algum modelo (fora o auditLog)? */
function escreve(body: string): boolean {
  const re = /(?:prisma|tx)\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g
  for (const m of body.matchAll(re)) if (m[1] !== 'auditLog') return true
  return false
}
const audita = (body: string) => /\blogAudit\s*\(/.test(body)

// ── Exceções justificadas ────────────────────────────────────────────────────
// Infra / auto-serviço: não são "ator muda dado de negócio de terceiro".
const EXCECOES_INFRA: Record<string, string> = {
  'lib/push-actions.ts#subscribeUser':   'infra: assinatura de push do próprio aparelho, não é dado de negócio',
  'lib/push-actions.ts#unsubscribeUser': 'infra: cancela assinatura de push do próprio aparelho',
  '(auth)/actions.ts#resetPassword':     'segurança: redefinição da própria senha por token de uso único (sem ator logado); coberta pelo token + bump de sessão',
  '(auth)/trocar-senha/actions.ts#trocarSenhaAction': 'segurança: troca da própria senha; coberta por BUMP_SESSION_VERSION',
  'mfa/cadastro/actions.ts#confirmarCadastroMfa':     'segurança: cadastro do próprio 2º fator',
}
// Backlog M-03b…n: dado de negócio que AINDA não audita. Some daqui conforme os lotes fecham.
const EXCECOES_PENDENTE: Record<string, string> = {
  // M-03b fechou: admin/criarPlanta + produtos-químicos
  // M-03c fechou: manutenção (preventiva/corretiva) + turnos + tarefas-padrão
  // M-03d fechou: importação IA + escala + tarefas de turno
  // M-03e fechou: operador/turnos (abrir, passagem, tarefas, assumir posto)
  'tecnico/analises/actions.ts#registrarAnalise':                         'pendente M-03f (análises)',
  'tecnico/equipamentos/actions.ts#criarEquipamento':                     'pendente M-03f (equipamentos)',
  'tecnico/equipamentos/actions.ts#editarEquipamento':                    'pendente M-03f (equipamentos)',
  'tecnico/equipamentos/actions.ts#toggleAtivoEquipamento':               'pendente M-03f (equipamentos)',
  'tecnico/equipamentos/actions.ts#concluirPreventiva':                   'pendente M-03f (equipamentos)',
  'tecnico/equipamentos/actions.ts#registrarCorretiva':                   'pendente M-03f (equipamentos)',
}
const EXCECOES = { ...EXCECOES_INFRA, ...EXCECOES_PENDENTE }

describe('cobertura de auditoria nas server actions (M-03)', () => {
  const escritas: string[] = []
  const semAudit: string[] = []
  for (const f of SERVER_FILES) {
    for (const a of actions(f)) {
      if (!escreve(a.body)) continue
      const k = chave(f, a.name)
      escritas.push(k)
      if (!audita(a.body)) semAudit.push(k)
    }
  }

  it('achou um número plausível de actions de escrita', () => {
    expect(escritas.length).toBeGreaterThan(40)
  })

  it('toda action de escrita audita OU está justificada em EXCECOES', () => {
    const faltando = semAudit.filter((k) => !(k in EXCECOES))
    expect(faltando).toEqual([])
  })

  it('não há exceção obsoleta (que já audita ou não escreve mais)', () => {
    const obsoletas = Object.keys(EXCECOES).filter((k) => !semAudit.includes(k))
    expect(obsoletas).toEqual([])
  })
})
