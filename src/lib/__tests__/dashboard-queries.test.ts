/**
 * T-23 — dashboard do gestor: nada de linha de medição vindo para o servidor só para contar ou
 * desenhar, listas com limite, e cache que nunca mistura plantas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// ─── mocks ────────────────────────────────────────────────────────────────────
const raw = vi.fn()
const grupos = vi.fn()
const produtos = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...a: unknown[]) => raw(...a),
    chemicalStockExit: { groupBy: (...a: unknown[]) => grupos(...a) },
    chemicalProduct: { findMany: (...a: unknown[]) => produtos(...a) },
  },
}))
const cacheado = vi.fn()
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: never[]) => unknown, keyParts: string[], opts: { revalidate: number; tags: string[] }) => {
    cacheado(keyParts, opts)
    return (...a: never[]) => fn(...a)
  },
}))

const Q = await import('@/server/dashboard/queries')

/** Texto do SQL cru recebido pelo $queryRaw (Prisma.sql -> strings + valores). */
const sqlDe = (chamada: number) => {
  const arg = raw.mock.calls[chamada][0] as { strings?: string[]; sql?: string }
  return (arg.strings ?? [arg.sql ?? '']).join('?')
}
const valoresDe = (chamada: number) => ((raw.mock.calls[chamada][0] as { values?: unknown[] }).values ?? [])

beforeEach(() => {
  raw.mockReset(); grupos.mockReset(); produtos.mockReset(); cacheado.mockReset()
  vi.unstubAllEnvs()
})

describe('cache por planta', () => {
  it('TTL padrão 60 s; 0 desliga; valor inválido volta ao padrão', () => {
    expect(Q.ttlCache()).toBe(60)
    vi.stubEnv('DASHBOARD_CACHE_TTL', '0'); expect(Q.ttlCache()).toBe(0)
    vi.stubEnv('DASHBOARD_CACHE_TTL', '15'); expect(Q.ttlCache()).toBe(15)
    vi.stubEnv('DASHBOARD_CACHE_TTL', 'abc'); expect(Q.ttlCache()).toBe(60)
    vi.stubEnv('DASHBOARD_CACHE_TTL', '-3'); expect(Q.ttlCache()).toBe(60)
  })

  it('a chave e a etiqueta começam pela planta: plantas diferentes nunca dividem entrada de cache', async () => {
    const fn = vi.fn(async (t: string) => `dados de ${t}`)
    await Q.comCache('sparkline', 'plantaA', fn, 'plantaA')
    await Q.comCache('sparkline', 'plantaB', fn, 'plantaB')
    const [chaveA, optA] = cacheado.mock.calls[0]
    const [chaveB, optB] = cacheado.mock.calls[1]
    expect(chaveA).toEqual(['dashboard', 'plantaA', 'sparkline'])
    expect(chaveB).toEqual(['dashboard', 'plantaB', 'sparkline'])
    expect(optA.tags).toEqual(['dashboard:plantaA'])
    expect(optB.tags).toEqual(['dashboard:plantaB'])
    expect(optA.revalidate).toBe(60)
  })

  it('com TTL 0 não passa pelo cache', async () => {
    vi.stubEnv('DASHBOARD_CACHE_TTL', '0')
    const fn = vi.fn(async () => 42)
    expect(await Q.comCache('x', 'T', fn)).toBe(42)
    expect(cacheado).not.toHaveBeenCalled()
  })

  it('arredonda o horário ao minuto (mesma chave dentro do minuto)', () => {
    expect(Q.aoMinuto(new Date('2026-10-08T12:34:56.789Z'))).toBe('2026-10-08T12:34:00.000Z')
    expect(Q.aoMinuto(new Date('2026-10-08T12:34:00.000Z'))).toBe('2026-10-08T12:34:00.000Z')
  })

  it('ocorrências abertas (status da ETE) não usam cache', () => {
    const fonte = fs.readFileSync(path.join(process.cwd(), 'src/app/gestor/dashboard/page.tsx'), 'utf8')
    expect(fonte).toMatch(/\n\s+contarOcorrenciasAbertas\(tenant_id, pontoId\)/)
    expect(fonte).not.toMatch(/comCache\([^)]*contarOcorrenciasAbertas/)
    expect(fonte).not.toMatch(/comCache\([^)]*alertasAbertos/)
  })
})

describe('consultas agregadas', () => {
  it('serieSeteDias: dia 0 (últimas 24 h) vai para o último índice e soma as três origens', async () => {
    raw.mockResolvedValueOnce([{ dia: 0, n: BigInt(5) }, { dia: 3, n: BigInt(2) }, { dia: 6, n: BigInt(1) }])
    const s = await Q.serieSeteDias('T1', '2026-10-08T12:00:00.000Z')
    expect(s).toEqual([1, 0, 0, 2, 0, 0, 5])
    // 1 única consulta, filtrada pela planta nas 3 tabelas
    expect(raw).toHaveBeenCalledTimes(1)
    const sql = sqlDe(0)
    expect(sql.match(/tenant_id = \?/g)).toHaveLength(3)
    expect(sql).toMatch(/GROUP BY dia/)
    expect(valoresDe(0)).toContain('T1')
  })

  it('serieSeteDias com ponto filtra as três tabelas pelo ponto', async () => {
    raw.mockResolvedValueOnce([])
    await Q.serieSeteDias('T1', '2026-10-08T12:00:00.000Z', 'P9')
    expect(sqlDe(0).match(/collection_point_id = \?/g)).toHaveLength(3)
  })

  it('mapaDeCalor: DANGER se houve não conformidade, WARNING se não houve medição, senão OK', async () => {
    raw.mockResolvedValueOnce([
      { id: 'a', name: 'A', n: BigInt(10), nc: BigInt(2) },
      { id: 'b', name: 'B', n: BigInt(0), nc: BigInt(0) },
      { id: 'c', name: 'C', n: BigInt(4), nc: BigInt(0) },
    ])
    expect(await Q.mapaDeCalor('T1', '2026-10-07T12:00:00.000Z')).toEqual([
      { id: 'a', name: 'A', status: 'DANGER' },
      { id: 'b', name: 'B', status: 'WARNING' },
      { id: 'c', name: 'C', status: 'OK' },
    ])
    expect(raw).toHaveBeenCalledTimes(1)
    expect(sqlDe(0).match(/tenant_id = \?/g)!.length).toBeGreaterThanOrEqual(4)
  })

  it('contarMedicoes converte bigint e usa uma consulta por tabela', async () => {
    raw.mockResolvedValueOnce([{ today: BigInt(3), yesterday: BigInt(2), total_current: BigInt(100), nc_current: BigInt(10), total_prev: BigInt(90), nc_prev: BigInt(9), today_nc: BigInt(1) }])
    const iso = '2026-10-08T00:00:00.000Z'
    const r = await Q.contarMedicoes('T1', 'analyses', iso, iso, iso, iso)
    expect(r).toEqual({ today: 3, yesterday: 2, total_current: 100, nc_current: 10, total_prev: 90, nc_prev: 9, today_nc: 1 })
    expect(raw).toHaveBeenCalledTimes(1)
    expect(sqlDe(0)).toMatch(/FROM analyses/)
    expect(sqlDe(0)).toMatch(/collected_at/)
  })

  it('consumoQuimicos: soma no banco, ordena do maior para o menor e ignora produto de outra planta', async () => {
    grupos.mockResolvedValueOnce([
      { product_id: 'p1', _sum: { quantity: 5 } },
      { product_id: 'p2', _sum: { quantity: 12.5 } },
      { product_id: 'p3', _sum: { quantity: 99 } }, // não pertence à planta (não volta em produtos)
    ])
    produtos.mockResolvedValueOnce([{ id: 'p1', name: 'Cloro', unit: 'kg' }, { id: 'p2', name: 'Soda', unit: 'L' }])
    const r = await Q.consumoQuimicos('T1', '2026-09-08T00:00:00.000Z')
    expect(r).toEqual([{ name: 'Soda', unit: 'L', total: 12.5 }, { name: 'Cloro', unit: 'kg', total: 5 }])
    expect(grupos.mock.calls[0][0].where.tenant_id).toBe('T1')
    expect(produtos.mock.calls[0][0].where.tenant_id).toBe('T1')
  })

  it('consumoQuimicos sem saídas não consulta produtos', async () => {
    grupos.mockResolvedValueOnce([])
    expect(await Q.consumoQuimicos('T1', '2026-09-08T00:00:00.000Z')).toEqual([])
    expect(produtos).not.toHaveBeenCalled()
  })
})

describe('listas com limite', () => {
  it('alertasAbertos pede só os mais graves (LIMIT), ordena por gravidade e por data', async () => {
    raw.mockResolvedValueOnce([{ id: 'o1', description: 'x', severity: 'CRITICAL', status: 'OPEN', created_at: new Date(), point_name: 'P1' }, { id: 'o2', description: 'y', severity: 'LOW', status: 'IN_PROGRESS', created_at: new Date(), point_name: null }])
    const r = await Q.alertasAbertos('T1')
    expect(r[0].collection_point).toEqual({ name: 'P1' })
    expect(r[1].collection_point).toBeNull()
    const sql = sqlDe(0)
    expect(sql).toMatch(/LIMIT/)
    expect(sql).toMatch(/CASE o\.severity WHEN 'CRITICAL' THEN 4/)
    expect(sql).toMatch(/left\(o\.description, 300\)/)
    expect(valoresDe(0)).toContain(Q.ALERTAS_NO_PAINEL)
    expect(valoresDe(0).filter((v) => v === 'T1').length).toBeGreaterThanOrEqual(2) // ocorrência e ponto
  })

  it('série de tendência: decimada no banco, com teto por origem, sempre com primeiro/último e as não conformidades', async () => {
    raw.mockResolvedValue([])
    await Q.serieTendencia('T1', 'PAR', '2026-09-08T00:00:00.000Z')
    expect(raw).toHaveBeenCalledTimes(3) // leituras, análises, laudos externos
    for (let i = 0; i < 3; i++) {
      const sql = sqlDe(i)
      expect(sql).toMatch(/row_number\(\) OVER \(ORDER BY/)
      expect(sql).toMatch(/rn = 1 OR rn = n/)
      expect(sql).toMatch(/nc AND rk <=/)
      expect(valoresDe(i)).toContain(Q.TREND_MAX_POINTS)
      expect(valoresDe(i)).toContain(Q.TREND_MAX_NC)
      expect(valoresDe(i)).toContain('T1')
    }
  })

  it('tetos pensados para o payload: ≤ 300 pontos por origem', () => {
    expect(Q.TREND_MAX_POINTS).toBeLessThanOrEqual(300)
    expect(Q.ALERTAS_NO_PAINEL).toBeLessThanOrEqual(20)
  })
})

describe('a página não busca linha de medição para contar ou desenhar', () => {
  const fonte = fs.readFileSync(path.join(process.cwd(), 'src/app/gestor/dashboard/page.tsx'), 'utf8')

  it('sem findMany em leituras, análises, laudos, saídas de estoque ou ocorrências', () => {
    expect(fonte).not.toMatch(/prisma\.(reading|analysis|externalAnalysis|chemicalStockExit|occurrence)\.findMany/)
    expect(fonte).not.toMatch(/prisma\.collectionPoint\.findMany/) // o mapa de calor não traz mais as linhas das últimas 24 h
  })

  it('o código morto src/app/gestor/dashboard/queries.ts foi removido', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'src/app/gestor/dashboard/queries.ts'))).toBe(false)
  })

  it('todo SQL cru do módulo filtra por tenant_id', () => {
    const mod = fs.readFileSync(path.join(process.cwd(), 'src/server/dashboard/queries.ts'), 'utf8')
    const blocos = mod.split('prisma.$queryRaw').slice(1)
    expect(blocos.length).toBeGreaterThanOrEqual(6)
    for (const b of blocos) expect(b.slice(0, 2500)).toMatch(/tenant_id = \$\{tenantId\}/)
  })
})
