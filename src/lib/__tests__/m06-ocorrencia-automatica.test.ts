/**
 * M-06 — caminho único de ocorrência automática (`src/server/occurrences/criar.ts`).
 *
 * Cobre: prazo padrão (severidade configurada), fallback de 24h, persistência com
 * collection_point_id/type/severity, validação do ponto (rollback: não cria se o
 * ponto não é do tenant), e disparo da notificação SÓ pós-commit (o hook é devolvido,
 * não chamado dentro da transação). Mais o teste de contrato: nenhum occurrence.create
 * fora de criar.ts e da criação manual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const handleNewOccurrenceMock = vi.fn()
vi.mock('@/lib/occurrences', () => ({
  handleNewOccurrence: (...a: unknown[]) => handleNewOccurrenceMock(...a),
}))

import { criarOcorrenciaAutomatica, FALLBACK_DEADLINE_HOURS } from '@/server/occurrences/criar'

type Row = Record<string, unknown> | null
function fakeTx(opts: { ponto?: Row; prazoHoras?: number | null }) {
  const occurrenceCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'occ1', ...data }))
  const tx = {
    $executeRaw: vi.fn(async () => 1),                                   // advisory lock (M-07)
    collectionPoint: { findFirst: vi.fn(async () => opts.ponto ?? null) },
    occurrenceSeverityDefault: {
      findUnique: vi.fn(async () => (opts.prazoHoras == null ? null : { deadline_hours: opts.prazoHoras })),
    },
    occurrence: { create: occurrenceCreate, findFirst: vi.fn(async () => null) }, // sem reincidência aberta
    occurrenceComment: { create: vi.fn() },
    auditLog: { create: vi.fn() }, // E2: criação automática audita
  }
  return { tx, occurrenceCreate }
}

const base = {
  tenantId: 'A', userId: 'u1', type: 'OPERATIONAL' as const, severity: 'HIGH' as const,
  description: 'NC x', collectionPointId: 'p1', parameterId: 'q1',
}

beforeEach(() => handleNewOccurrenceMock.mockReset())

describe('criarOcorrenciaAutomatica (M-06)', () => {
  it('prazo padrão: usa deadline_hours da severidade quando configurado', async () => {
    handleNewOccurrenceMock.mockResolvedValue(vi.fn())
    const { tx, occurrenceCreate } = fakeTx({ ponto: { id: 'p1' }, prazoHoras: 72 })
    const antes = Date.now()
    // @ts-expect-error tx fake só com os métodos usados
    await criarOcorrenciaAutomatica(tx, base)
    const { deadline } = occurrenceCreate.mock.calls[0][0].data as { deadline: Date }
    const horas = (deadline.getTime() - antes) / 3_600_000
    expect(horas).toBeGreaterThan(71.9)
    expect(horas).toBeLessThan(72.2)
  })

  it('fallback de 24h quando não há prazo configurado para a severidade', async () => {
    expect(FALLBACK_DEADLINE_HOURS).toBe(24)
    handleNewOccurrenceMock.mockResolvedValue(vi.fn())
    const { tx, occurrenceCreate } = fakeTx({ ponto: { id: 'p1' }, prazoHoras: null })
    const antes = Date.now()
    // @ts-expect-error tx fake
    await criarOcorrenciaAutomatica(tx, base)
    const { deadline } = occurrenceCreate.mock.calls[0][0].data as { deadline: Date }
    const horas = (deadline.getTime() - antes) / 3_600_000
    expect(horas).toBeGreaterThan(23.9)
    expect(horas).toBeLessThan(24.2)
  })

  it('persiste com collection_point_id, type, severity, status e reported_by', async () => {
    handleNewOccurrenceMock.mockResolvedValue(vi.fn())
    const { tx, occurrenceCreate } = fakeTx({ ponto: { id: 'p1' }, prazoHoras: 24 })
    // @ts-expect-error tx fake
    await criarOcorrenciaAutomatica(tx, { ...base, type: 'LABORATORY' })
    expect(occurrenceCreate.mock.calls[0][0].data).toMatchObject({
      tenant_id: 'A', collection_point_id: 'p1', type: 'LABORATORY',
      severity: 'HIGH', status: 'OPEN', reported_by: 'u1',
    })
  })

  it('ponto de outra planta/inexistente: lança e NÃO cria ocorrência (rollback)', async () => {
    const { tx, occurrenceCreate } = fakeTx({ ponto: null, prazoHoras: 24 })
    // @ts-expect-error tx fake
    await expect(criarOcorrenciaAutomatica(tx, base)).rejects.toThrow(/ponto de coleta inválido/i)
    expect(occurrenceCreate).not.toHaveBeenCalled()
    expect(handleNewOccurrenceMock).not.toHaveBeenCalled()
  })

  it('type/severity inválidos são recusados antes de qualquer gravação', async () => {
    const { tx, occurrenceCreate } = fakeTx({ ponto: { id: 'p1' } })
    // @ts-expect-error tipo inválido de propósito
    await expect(criarOcorrenciaAutomatica(tx, { ...base, type: 'FOO' })).rejects.toThrow(/tipo de ocorrência inválido/i)
    // @ts-expect-error severidade inválida de propósito
    await expect(criarOcorrenciaAutomatica(tx, { ...base, severity: 'URGENTE' })).rejects.toThrow(/severidade inválida/i)
    expect(occurrenceCreate).not.toHaveBeenCalled()
  })

  it('devolve um hook de notificação SEM dispará-lo (só roda pós-commit)', async () => {
    const hook = vi.fn()
    handleNewOccurrenceMock.mockResolvedValue(hook)
    const { tx } = fakeTx({ ponto: { id: 'p1' }, prazoHoras: 24 })
    // @ts-expect-error tx fake
    const devolvido = await criarOcorrenciaAutomatica(tx, base)
    expect(typeof devolvido).toBe('function')   // hook composto (push + WhatsApp quando alta/crítica)
    expect(hook).not.toHaveBeenCalled()         // notificação não disparou dentro da transação
  })
})

describe('contrato M-06: occurrence.create só no caminho único e na criação manual', () => {
  const SRC = join(process.cwd(), 'src')
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(full, acc) }
      else if (/\.tsx?$/.test(e)) acc.push(full)
    }
    return acc
  }
  const PERMITIDOS = new Set([
    'server/occurrences/criar.ts',          // caminho único (automático)
    'app/operador/ocorrencias/actions.ts',  // criação manual (fora do M-06 por decisão do dono)
  ])

  it('nenhum occurrence.create solto fora dos arquivos permitidos', () => {
    const fora: string[] = []
    for (const f of walk(SRC)) {
      const t = readFileSync(f, 'utf-8')
      if (/(?:prisma|tx)\.occurrence\.create\s*\(/.test(t)) {
        const rel = f.replace(/\\/g, '/').slice(SRC.replace(/\\/g, '/').length + 1)
        if (!PERMITIDOS.has(rel)) fora.push(rel)
      }
    }
    expect(fora).toEqual([])
  })
})
