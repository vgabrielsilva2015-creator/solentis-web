/** T-29: o CI bloqueia por lint, tipos, testes e build; o lint está zerado de erros e sem exceções escondidas. */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
const eslintCfg = readFileSync('eslint.config.mjs', 'utf8')

describe('CI', () => {
  it('roda lint, tipos, testes, build, audit, integração e varredura de segredos', () => {
    for (const trecho of ['npm run lint', 'npx tsc --noEmit', 'npx vitest run --no-cache', 'npm run build', 'npm audit --omit=dev --audit-level=high', 'npm run test:integration', 'gitleaks']) {
      expect(ci).toContain(trecho)
    }
  })
  it('só o E2E (ainda não verificado) é não-bloqueante', () => {
    expect(ci.match(/continue-on-error: true/g)).toHaveLength(1)
    expect(ci.indexOf('continue-on-error: true')).toBeGreaterThan(ci.indexOf('  e2e:'))
  })
})

describe('lint', () => {
  it('as regras de erro não foram afrouxadas além do combinado (só 3 do React Compiler viram aviso; require liberado só em .js de script)', () => {
    const regrasOff = [...eslintCfg.matchAll(/"([@\w/-]+)":\s*"(off|warn)"/g)].map((m) => `${m[1]}:${m[2]}`).sort()
    expect(regrasOff).toEqual([
      '@typescript-eslint/no-require-imports:off',
      'react-hooks/purity:warn',
      'react-hooks/set-state-in-effect:warn',
      'react-hooks/static-components:warn',
    ])
    expect(eslintCfg).not.toMatch(/no-explicit-any/)
  })

  it('nenhum arquivo de src usa eslint-disable geral nem @ts-ignore', () => {
    const lista = (d: string): string[] => readdirSync(d).flatMap((n) => {
      const p = join(d, n)
      return statSync(p).isDirectory() ? lista(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
    const ofensores = lista('src').filter((f) => !f.includes('__tests__')).filter((f) => {
      const t = readFileSync(f, 'utf8')
      return /@ts-ignore|eslint-disable(?!-next-line)/.test(t)
    })
    expect(ofensores).toEqual([])
  })

  it('os eslint-disable-next-line do app não aumentam (hoje 8: <img> de foto, deps de efeito, link que recarrega a página)', () => {
    const lista = (d: string): string[] => readdirSync(d).flatMap((n) => {
      const p = join(d, n)
      return statSync(p).isDirectory() ? lista(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
    const usos = lista('src').filter((f) => !f.includes('__tests__')).flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').filter((l) => /eslint-disable-next-line/.test(l)).map((l) => `${f}: ${l.trim()}`))
    expect(usos.length).toBeLessThanOrEqual(8)
  })
})
