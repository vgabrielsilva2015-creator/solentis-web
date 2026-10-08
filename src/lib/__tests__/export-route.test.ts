/** T-22 — /api/export: período obrigatório, tudo filtrado por planta e período, sem corte em 1000 linhas. */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const MODELOS = ['occurrence', 'reading', 'analysis', 'preventiveMaintenance', 'externalAnalysis'] as const
type Args = { where: Record<string, unknown>; take: number; cursor?: { id: string }; skip?: number; orderBy: unknown }
const pedidos: Array<{ modelo: string; args: Args }> = []
let role = 'MANAGER'
let total = 2500

const registro = (i: number) => {
  const d = new Date('2026-03-05T12:00:00Z')
  return {
    id: `r${String(i).padStart(5, '0')}`, created_at: d, recorded_at: d, collected_at: d, scheduled_date: d, completed_date: null, deadline: d,
    severity: 'LOW', category: null, status: 'OPEN', description: `=desc ${i}`, notes: null, value: 1, unit: 'mg/L', is_non_conformant: false,
    laboratory_name: null, laudo_number: null,
    reporter: { name: 'Ana' }, recorder: { name: 'Ana' }, collector: { name: 'Ana' }, completer: null,
    collection_point: { name: 'Entrada' }, parameter: { name: 'pH', unit: 'mg/L' }, equipment: { name: 'Bomba', serial_number: null },
  }
}
const pagina = (modelo: string) => async (args: Args) => {
  pedidos.push({ modelo, args })
  const ini = args.cursor ? Number(args.cursor.id.slice(1)) + 1 : 0
  return Array.from({ length: Math.max(0, Math.min(args.take, total - ini)) }, (_, k) => registro(ini + k))
}

vi.mock('@/lib/prisma', () => ({ prisma: Object.fromEntries(MODELOS.map((m) => [m, { findMany: pagina(m) }])) }))
vi.mock('@/lib/auth', () => ({ auth: async () => (role === 'NONE' ? null : { user: { role, id: 'u1' } }) }))
vi.mock('@/lib/tenant', () => ({ getTenantId: async () => 'TENANT-A' }))

beforeEach(() => { pedidos.length = 0; role = 'MANAGER'; total = 2500 })
const url = (q: string) => new Request(`http://x/api/export?${q}`)
const P = 'from=2026-03-01&to=2026-03-31'

describe('GET /api/export', async () => {
  const { GET } = await import('@/app/api/export/route')

  it.each(['', 'from=2026-03-01', 'to=2026-03-31', 'from=x&to=y', 'from=2025-01-01&to=2026-06-01'])('período ausente/ inválido/ enorme (%j) → 400 e nenhuma consulta', async (q) => {
    const r = await GET(url(`type=occurrences&${q}`))
    expect(r.status).toBe(400)
    expect(pedidos).toEqual([])
  })

  it('perfil sem permissão → 403; sem sessão → 401', async () => {
    role = 'OPERATOR'; expect((await GET(url(`type=readings&${P}`))).status).toBe(403)
    role = 'NONE'; expect((await GET(url(`type=readings&${P}`))).status).toBe(401)
  })

  it('tipo desconhecido → 400', async () => {
    expect((await GET(url(`type=usuarios&${P}`))).status).toBe(400)
  })

  it.each([
    ['occurrences', 'occurrence', 'created_at'], ['readings', 'reading', 'recorded_at'], ['analyses', 'analysis', 'collected_at'],
    ['preventives', 'preventiveMaintenance', 'scheduled_date'], ['external_analyses', 'externalAnalysis', 'collected_at'],
  ])('%s: entrega todas as 2500 linhas, em páginas de até 1000, só da planta e do período', async (type, modelo, campo) => {
    const r = await GET(url(`type=${type}&${P}&status=all`))
    expect(r.status).toBe(200)
    expect(r.headers.get('content-disposition')).toMatch(/_2026-03-01_a_2026-03-31\.csv"/)
    expect(r.headers.get('content-type')).toMatch(/text\/csv/)
    const texto = await r.text()
    expect(texto.replace(/^﻿/, '').split('\n').filter(Boolean)).toHaveLength(2501)
    expect(pedidos.length).toBe(3)
    for (const { modelo: m, args } of pedidos) {
      expect(m).toBe(modelo)
      expect(args.take).toBeLessThanOrEqual(1000)
      expect(args.where.tenant_id).toBe('TENANT-A')
      expect(args.where[campo]).toEqual({ gte: new Date('2026-03-01T03:00:00Z'), lt: new Date('2026-04-01T03:00:00Z') })
    }
    expect(pedidos[1].args.cursor).toEqual({ id: 'r00999' })
    expect(pedidos[1].args.skip).toBe(1)
  })

  it('ocorrências: sem status=all, só abertas e em andamento', async () => {
    await (await GET(url(`type=occurrences&${P}`))).text()
    expect(pedidos[0].args.where.status).toEqual({ in: ['OPEN', 'IN_PROGRESS'] })
  })

  it('célula iniciada por "=" sai neutralizada (CSV injection)', async () => {
    total = 1
    const texto = await (await GET(url(`type=occurrences&${P}&status=all`))).text()
    expect(texto).toContain(`"'=desc 0"`)
  })
})
