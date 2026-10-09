/**
 * T-05 — checkOwnership / assertOwned.
 * Banco simulado em memória: duas plantas (A e B) com ids distintos.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const { checkOwnership, assertOwned, OwnershipError } = await import('@/lib/ownership')
const { isUserFacingError, toUserMessage } = await import('@/lib/user-errors')

type Row = { id: string; tenant_id: string; is_active?: boolean; role?: string }
const ROWS: Record<string, Row[]> = {
  collectionPoint: [{ id: 'cpA', tenant_id: 'A' }, { id: 'cpB', tenant_id: 'B' }],
  user: [
    { id: 'opA', tenant_id: 'A', is_active: true, role: 'OPERATOR' },
    { id: 'gestorA', tenant_id: 'A', is_active: true, role: 'MANAGER' },
    { id: 'inativoA', tenant_id: 'A', is_active: false, role: 'OPERATOR' },
    { id: 'opB', tenant_id: 'B', is_active: true, role: 'OPERATOR' },
  ],
  chemicalProduct: [{ id: 'pA', tenant_id: 'A' }, { id: 'pB', tenant_id: 'B' }],
}

const calls: Array<Record<string, unknown>> = []
function fakeDb() {
  const make = (model: string) => ({
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      calls.push(where)
      const row = (ROWS[model] ?? []).find((r) =>
        Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v))
      return row ? { id: row.id } : null
    },
  })
  const models = ['collectionPoint', 'qualityParameter', 'analysisMethod', 'equipment', 'equipmentCategory',
    'user', 'chemicalProduct', 'shift', 'shiftInstance', 'occurrence']
  return Object.fromEntries(models.map((m) => [m, make(m)])) as never
}

describe('checkOwnership', () => {
  const db = fakeDb()

  it('aceita referência da própria planta', async () => {
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: 'cpA' }], db)).toBeNull()
  })

  it('recusa referência de outra planta, com mensagem para o usuário', async () => {
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: 'cpB' }], db))
      .toBe('Ponto de coleta inválido ou não autorizado.')
  })

  it('mensagens padrão concordam em gênero', async () => {
    expect(await checkOwnership('A', [{ model: 'equipmentCategory', id: 'x' }], db)).toBe('Categoria inválida ou não autorizada.')
    expect(await checkOwnership('A', [{ model: 'occurrence', id: 'x' }], db)).toBe('Ocorrência inválida ou não autorizada.')
  })

  it('recusa id inexistente', async () => {
    expect(await checkOwnership('A', [{ model: 'chemicalProduct', id: 'nao-existe' }], db)).not.toBeNull()
  })

  it('campo obrigatório vazio é recusado; opcional vazio é aceito', async () => {
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: '' }], db)).not.toBeNull()
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: null }], db)).not.toBeNull()
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: '', optional: true }], db)).toBeNull()
    expect(await checkOwnership('A', [{ model: 'collectionPoint', id: undefined, optional: true }], db)).toBeNull()
  })

  it('opcional preenchido com id de outra planta continua recusado', async () => {
    expect(await checkOwnership('A', [{ model: 'user', id: 'opB', optional: true }], db)).not.toBeNull()
  })

  it('valor que não é string (ex.: objeto injetado) é recusado sem consultar o banco', async () => {
    calls.length = 0
    const evil = { not: 'x' } as unknown as string
    expect(await checkOwnership('A', [{ model: 'user', id: evil }], db)).not.toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('filtros extras se aplicam (ativo, papel)', async () => {
    const ref = { model: 'user' as const, where: { is_active: true, role: 'OPERATOR' } }
    expect(await checkOwnership('A', [{ ...ref, id: 'opA' }], db)).toBeNull()
    expect(await checkOwnership('A', [{ ...ref, id: 'gestorA' }], db)).not.toBeNull()
    expect(await checkOwnership('A', [{ ...ref, id: 'inativoA' }], db)).not.toBeNull()
  })

  it('filtro extra NÃO consegue trocar o tenant da consulta', async () => {
    calls.length = 0
    const r = await checkOwnership('A', [{ model: 'user', id: 'opB', where: { tenant_id: 'B' } }], db)
    expect(r).not.toBeNull()
    expect(calls[0]).toMatchObject({ id: 'opB', tenant_id: 'A' })
  })

  it('devolve a mensagem do primeiro item recusado, na ordem informada', async () => {
    const r = await checkOwnership('A', [
      { model: 'collectionPoint', id: 'cpA' },
      { model: 'user', id: 'opB', message: 'Responsável inválido.' },
      { model: 'chemicalProduct', id: 'pB' },
    ], db)
    expect(r).toBe('Responsável inválido.')
  })

  it('tenant vazio é erro de programação, não "liberado"', async () => {
    await expect(checkOwnership('', [{ model: 'collectionPoint', id: 'cpA' }], db)).rejects.toThrow()
  })
})

describe('assertOwned', () => {
  const db = fakeDb()

  it('passa em silêncio quando pertence', async () => {
    await expect(assertOwned('B', { model: 'chemicalProduct', id: 'pB' }, db)).resolves.toBeUndefined()
  })

  it('lança OwnershipError com mensagem segura para a tela', async () => {
    const err = await assertOwned('B', { model: 'chemicalProduct', id: 'pA' }, db).catch((e) => e)
    expect(err).toBeInstanceOf(OwnershipError)
    expect(isUserFacingError(err)).toBe(true)
    expect(toUserMessage(err)).toBe('Produto inválido ou não autorizado.')
  })
})
