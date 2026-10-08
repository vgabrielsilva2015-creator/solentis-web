/** T-21: e-mail, destinatário e telefone nunca aparecem no log; segredos continuam mascarados. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import pino from 'pino'
import { REDACT_PATHS } from '@/lib/logger'

function logar(obj: Record<string, unknown>): string {
  let saida = ''
  const l = pino({ redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } }, { write: (s: string) => { saida += s } } as never)
  l.info(obj, 'teste')
  return saida
}

describe('máscara do logger', () => {
  it.each([
    [{ email: 'maria@empresa.com' }, 'maria@empresa.com'],
    [{ to: 'maria@empresa.com' }, 'maria@empresa.com'],
    [{ user: { email: 'joao@empresa.com' } }, 'joao@empresa.com'],
    [{ phone: '+5549999990000' }, '5549999990000'],
    [{ password: 'Segredo@123' }, 'Segredo@123'],
    [{ data: { token: 'abc.def.ghi' } }, 'abc.def.ghi'],
  ])('%j é mascarado', (obj, valor) => {
    const s = logar(obj as Record<string, unknown>)
    expect(s).not.toContain(valor)
    expect(s).toContain('[REDACTED]')
  })
})

describe('e-mail simulado em desenvolvimento', () => {
  it('não grava o endereço nem o corpo do e-mail (link com token) no log', () => {
    const t = readFileSync(join(process.cwd(), 'src/lib/email.ts'), 'utf-8')
    expect(t).not.toMatch(/logger\.info\(\s*\{[^}]*\bto\s*[,:}]/)
    expect(t).not.toMatch(/htmlPreview/)
  })
})
