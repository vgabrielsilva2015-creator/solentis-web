import { describe, it, expect } from 'vitest'
import { isFeatureEnabled, parseTenantFeatures, FEATURES } from '@/lib/features'

describe('features', () => {
  it('recurso base está sempre ligado, ignorando o JSON da planta', () => {
    expect(isFeatureEnabled(null, 'dashboard')).toBe(true)
    expect(isFeatureEnabled({ dashboard: false }, 'dashboard')).toBe(true)
  })

  it('todos os módulos atuais são base (de fábrica)', () => {
    expect(FEATURES.every((f) => f.base)).toBe(true)
  })

  it('chave desconhecida é fail-closed (false)', () => {
    expect(isFeatureEnabled({ qualquer: true }, 'nao-existe')).toBe(false)
  })

  it('parseTenantFeatures mantém só booleanos', () => {
    expect(parseTenantFeatures({ a: true, b: 'x', c: 1, d: false })).toEqual({ a: true, d: false })
    expect(parseTenantFeatures(null)).toEqual({})
    expect(parseTenantFeatures('lixo')).toEqual({})
  })
})
