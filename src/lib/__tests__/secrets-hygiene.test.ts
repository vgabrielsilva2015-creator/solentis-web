/**
 * T-08 — nenhum segredo versionado.
 * Varre os arquivos RASTREADOS pelo Git (git ls-files). Nunca imprime o valor
 * encontrado, só o arquivo, a linha e o tipo de segredo.
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { readFileSync, statSync } from 'fs'

function tracked(): string[] {
  try {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf-8' }).split('\0').filter(Boolean)
  } catch {
    return [] // fora de um checkout Git (ex.: pacote) não há o que varrer
  }
}
const FILES = tracked()

const FORBIDDEN_FILES: Array<[RegExp, string]> = [
  [/(^|\/)\.env(\.(?!example$)[^/]*)?$/, '.env real'],
  [/recovery-codes/i, 'códigos de recuperação'],
  [/\.(pem|key|p12|pfx)$/i, 'chave privada/certificado'],
  [/\.dump$|(^|\/)backups\//, 'dump/backup de banco'],
]

// Formatos de credenciais REAIS. Placeholders (USER:PASSWORD, troque-por-...) não casam.
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, 'Resend API key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/\bvercel_blob_rw_[A-Za-z0-9]{10,}_[A-Za-z0-9]{20,}/, 'Vercel Blob token'],
  [/\bsk_live_[A-Za-z0-9]{20,}/, 'Stripe live key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'chave privada PEM'],
  [/postgres(?:ql)?:\/\/(?!USER:|user:|postgres:postgres@|postgres@)[^:\s/@'"]+:(?!PASSWORD@|password@|senha@)[^@\s'"]{6,}@[^\s'"]*(supabase|amazonaws|neon\.tech|render\.com)/, 'URL de Postgres com senha'],
]

const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|json|md|sql|yml|yaml|toml|txt|env\.example|example|sh|prisma|html|css)$/i

describe('higiene de segredos (T-08)', () => {
  it('há arquivos rastreados para verificar (sanity)', () => {
    expect(FILES.length).toBeGreaterThan(50)
  })

  it('nenhum arquivo proibido está versionado', () => {
    const achados = FILES.flatMap((f) =>
      FORBIDDEN_FILES.filter(([re]) => re.test(f)).map(([, tipo]) => `${f} (${tipo})`))
    expect(achados).toEqual([])
  })

  it('nenhum arquivo versionado contém credencial real', () => {
    const achados: string[] = []
    for (const f of FILES) {
      if (!TEXT_EXT.test(f) || f === 'package-lock.json' || f.endsWith('secrets-hygiene.test.ts')) continue
      let text: string
      try {
        if (statSync(f).size > 2_000_000) continue
        text = readFileSync(f, 'utf-8')
      } catch { continue }
      text.split('\n').forEach((line, i) => {
        for (const [re, tipo] of SECRET_PATTERNS) if (re.test(line)) achados.push(`${f}:${i + 1} (${tipo})`)
      })
    }
    expect(achados).toEqual([])
  })

  it('os padrões detectam credenciais e ignoram placeholders (autoteste)', () => {
    // Montados em partes para este arquivo não conter um "segredo" literal.
    const fakeGh = 'gh' + 'p_' + 'a'.repeat(36)
    const fakePg = 'postgresql://' + 'svc:' + 'S3nh4Forte' + '@db.abc.supabase.co:5432/postgres'
    const placeholder = 'postgresql://USER:PASSWORD@HOST:6543/postgres'
    const hit = (s: string) => SECRET_PATTERNS.some(([re]) => re.test(s))
    expect(hit(fakeGh)).toBe(true)
    expect(hit(fakePg)).toBe(true)
    expect(hit(placeholder)).toBe(false)
    expect(FORBIDDEN_FILES.some(([re]) => re.test('docs/recovery-codes.txt'))).toBe(true)
    expect(FORBIDDEN_FILES.some(([re]) => re.test('.env.example'))).toBe(false)
    expect(FORBIDDEN_FILES.some(([re]) => re.test('.env.local'))).toBe(true)
  })
})
