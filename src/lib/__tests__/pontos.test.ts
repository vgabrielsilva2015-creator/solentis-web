import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const PontoColetaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  matrix: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  is_field: z.preprocess((v) => v === 'on', z.boolean()),
  is_internal: z.preprocess((v) => v === 'on', z.boolean()),
  is_external: z.preprocess((v) => v === 'on', z.boolean()),
})

describe('PontoColetaSchema - Validação de Pontos de Coleta', () => {
  it('deve aceitar dados válidos com todas as flags ativas ("on")', () => {
    const data = {
      name: 'Entrada ETE',
      matrix: 'EFLUENTE',
      location: 'Calha Parshall',
      description: 'Ponto de entrada de efluente bruto',
      is_field: 'on',
      is_internal: 'on',
      is_external: 'on',
    }

    const r = PontoColetaSchema.safeParse(data)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.name).toBe('Entrada ETE')
      expect(r.data.is_field).toBe(true)
      expect(r.data.is_internal).toBe(true)
      expect(r.data.is_external).toBe(true)
    }
  })

  it('deve aceitar dados sem flags ativas (falsas)', () => {
    const data = {
      name: 'Poço de Teste',
      matrix: '',
      location: '',
      description: '',
      is_field: 'off',
      is_internal: 'off',
      is_external: 'off',
    }

    const r = PontoColetaSchema.safeParse(data)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.matrix).toBeNull()
      expect(r.data.location).toBeNull()
      expect(r.data.is_field).toBe(false)
      expect(r.data.is_internal).toBe(false)
      expect(r.data.is_external).toBe(false)
    }
  })

  it('deve rejeitar nome muito curto', () => {
    const data = {
      name: 'A',
      matrix: 'EFLUENTE',
      location: null,
      description: null,
      is_field: 'on',
      is_internal: 'off',
      is_external: 'off',
    }

    const r = PontoColetaSchema.safeParse(data)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].message).toContain('Nome deve ter pelo menos 2 caracteres')
    }
  })
})
