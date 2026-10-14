/**
 * M-16 — limites da importação de laudo por IA: magic bytes e política de rate limit.
 * Tudo puro (sem banco): protege a cota paga do Gemini contra arquivo forjado e abuso.
 */
import { describe, it, expect } from 'vitest'
import { sniffLaudoType } from '@/lib/laudo-sniff'
import { laudoAllowed, LAUDO_USER_LIMIT, LAUDO_TENANT_LIMIT } from '@/lib/rate-limit'

const comPrefixo = (...bytes: number[]) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(8)])

describe('sniffLaudoType (M-16)', () => {
  it('reconhece PDF pelo %PDF', () => {
    expect(sniffLaudoType(comPrefixo(0x25, 0x50, 0x44, 0x46))).toBe('application/pdf')
  })
  it('reconhece JPEG por FF D8 FF', () => {
    expect(sniffLaudoType(comPrefixo(0xff, 0xd8, 0xff))).toBe('image/jpeg')
  })
  it('reconhece PNG pela assinatura completa', () => {
    expect(sniffLaudoType(comPrefixo(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
  })
  it('rejeita conteúdo que não é laudo (ex.: HTML/EXE)', () => {
    expect(sniffLaudoType(Buffer.from('<html><body>', 'ascii'))).toBeNull() // "<htm..."
    expect(sniffLaudoType(comPrefixo(0x4d, 0x5a))).toBeNull() // MZ (executável)
  })
  it('rejeita buffer curto demais', () => {
    expect(sniffLaudoType(Buffer.from([0x25, 0x50]))).toBeNull()
  })
})

describe('laudoAllowed (M-16)', () => {
  it('permite abaixo dos dois limites', () => {
    expect(laudoAllowed({ user: 0, tenant: 0 })).toBe(true)
    expect(laudoAllowed({ user: LAUDO_USER_LIMIT - 1, tenant: LAUDO_TENANT_LIMIT - 1 })).toBe(true)
  })
  it('barra ao atingir o limite do usuário', () => {
    expect(laudoAllowed({ user: LAUDO_USER_LIMIT, tenant: 0 })).toBe(false)
  })
  it('barra ao atingir o limite do tenant (mesmo com usuário folgado)', () => {
    expect(laudoAllowed({ user: 0, tenant: LAUDO_TENANT_LIMIT })).toBe(false)
  })
})
