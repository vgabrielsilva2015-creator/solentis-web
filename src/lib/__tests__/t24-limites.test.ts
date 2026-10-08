/**
 * T-24 (P-17): limites de upload coerentes com os 4,5 MB por requisição da Vercel.
 * O arquivo do laudo vai como base64 (4/3) dentro do corpo da action; o manual vai como multipart.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MAX_REQUEST_BYTES, MAX_MANUAL_BYTES, MAX_LAUDO_BYTES, MAX_LAUDO_BASE64_CHARS, mb } from '@/lib/upload-limits'
import { MAX_TOTAL_UPLOAD_BYTES } from '@/lib/compress-image'

const VERCEL_LIMITE = 4.5 * 1024 * 1024
const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')

vi.mock('@/server/auth/guards', () => ({
  requirePermission: async () => ({ userId: 'u', tenantId: 'A', role: 'MANAGER' }),
  getActor: async () => ({ userId: 'u', tenantId: 'A', role: 'MANAGER' }),
  permissionError: () => null,
}))
vi.mock('@/lib/logger', () => ({ getLogger: async () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

describe('limites coerentes com a plataforma', () => {
  it('nenhum limite aceita uma requisição acima dos 4,5 MB da Vercel', () => {
    expect(MAX_REQUEST_BYTES).toBeLessThan(VERCEL_LIMITE)
    expect(MAX_MANUAL_BYTES).toBeLessThan(VERCEL_LIMITE)
    // o laudo maior aceito, já em base64, mais 100 KB de envelope, ainda cabe
    expect(MAX_LAUDO_BASE64_CHARS + 100 * 1024).toBeLessThan(VERCEL_LIMITE)
    expect(Math.ceil((MAX_LAUDO_BYTES * 4) / 3)).toBeLessThanOrEqual(MAX_LAUDO_BASE64_CHARS)
  })

  it('o limite total do cliente (foto + manual) não passa do limite do servidor', () => {
    expect(MAX_TOTAL_UPLOAD_BYTES).toBeLessThanOrEqual(MAX_REQUEST_BYTES)
  })

  it('mb() formata em português', () => {
    expect(mb(3 * 1024 * 1024)).toBe('3 MB')
    expect(mb(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })

  it('o código não tem mais os limites antigos (10 MB de manual, 14 M de base64, 4 MB de laudo)', () => {
    const eq = src('app/tecnico/equipamentos/actions.ts')
    expect(eq).not.toMatch(/10 \* 1024 \* 1024/)
    expect(eq).not.toMatch(/máximo 10 MB/)
    const laudo = src('app/gestor/importacao/actions.ts')
    expect(laudo).not.toMatch(/14_000_000/)
    const pagina = src('app/gestor/importacao/page.tsx')
    expect(pagina).not.toMatch(/4 \* 1024 \* 1024/)
    expect(pagina).toMatch(/MAX_LAUDO_BYTES/)
  })
})

describe('laudo grande demais é recusado no servidor antes de chamar a IA', async () => {
  const { extractDataFromPDF } = await import('@/app/gestor/importacao/actions')

  it('base64 acima do teto → erro com o limite em MB', async () => {
    await expect(extractDataFromPDF('A'.repeat(MAX_LAUDO_BASE64_CHARS + 1), 'application/pdf')).rejects.toThrow(/muito grande.*3 MB/)
  })

  it('exatamente no teto passa pela validação de tamanho (para na chave da IA, que não existe aqui)', async () => {
    const antes = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    await expect(extractDataFromPDF('A'.repeat(MAX_LAUDO_BASE64_CHARS), 'application/pdf')).rejects.toThrow(/GEMINI_API_KEY/)
    if (antes) process.env.GEMINI_API_KEY = antes
  })
})
