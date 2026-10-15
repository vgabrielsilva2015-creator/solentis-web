/**
 * M-07 — deduplicação de ocorrência automática no banco real (T-28).
 *
 * Prova: reincidência agrupa (comentário, sem nova ocorrência), resolvida gera nova,
 * parâmetro/ponto/tenant diferentes NÃO agrupam, e — o principal — concorrência:
 * duas NCs simultâneas do mesmo problema geram UMA ocorrência (advisory lock + índice
 * único parcial) SEM perder nenhuma leitura.
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { criarCenario } from '@/test/factories'
import { gravarLeitura } from '@/server/leituras/service'
import { criarOcorrenciaAutomatica } from '@/server/occurrences/criar'

function criarParametro(tenantId: string, createdBy: string, name = 'pH') {
  return prisma.qualityParameter.create({
    data: { tenant_id: tenantId, name, unit: 'pH', effective_date: new Date(), created_by: createdBy, min_limit: 6, max_limit: 9 },
  })
}

type Cenario = Awaited<ReturnType<typeof criarCenario>>
function nc(A: Cenario, parametroId: string, value = 11) {
  return gravarLeitura({
    tenantId: A.tenant.id, userId: A.operador.id, collectionPointId: A.ponto.id, parameterId: parametroId,
    value, unit: 'pH', notes: null, recordedAt: new Date(), clientId: null, photoFilename: null,
    isNonConformant: true, paramName: 'pH',
  })
}
const contarOcorrencias = (tenant_id: string) => prisma.occurrence.count({ where: { tenant_id } })

describe('deduplicação de ocorrência automática (M-07)', () => {
  it('primeira NC: cria 1 ocorrência com parameter_id e ponto', async () => {
    const A = await criarCenario('A'); const p = await criarParametro(A.tenant.id, A.gestor.id)
    await nc(A, p.id)
    const occ = await prisma.occurrence.findMany({ where: { tenant_id: A.tenant.id } })
    expect(occ).toHaveLength(1)
    expect(occ[0]).toMatchObject({ parameter_id: p.id, collection_point_id: A.ponto.id, status: 'OPEN' })
    expect(await prisma.occurrenceComment.count({ where: { occurrence_id: occ[0].id } })).toBe(0)
  })

  it('reincidência no mesmo ponto+parâmetro: continua 1 ocorrência, +1 comentário, 2 leituras', async () => {
    const A = await criarCenario('A'); const p = await criarParametro(A.tenant.id, A.gestor.id)
    await nc(A, p.id); await nc(A, p.id, 12)
    expect(await contarOcorrencias(A.tenant.id)).toBe(1)
    const occ = await prisma.occurrence.findFirst({ where: { tenant_id: A.tenant.id } })
    expect(await prisma.occurrenceComment.count({ where: { occurrence_id: occ!.id } })).toBe(1)
    expect(await prisma.reading.count({ where: { tenant_id: A.tenant.id } })).toBe(2)
  })

  it('E2: a ocorrência automática deixa rastro de auditoria (CREATE em occurrences)', async () => {
    const A = await criarCenario('A'); const p = await criarParametro(A.tenant.id, A.gestor.id)
    await nc(A, p.id)
    const audits = await prisma.auditLog.findMany({
      where: { tenant_id: A.tenant.id, table_name: 'occurrences', action: 'CREATE' },
    })
    expect(audits).toHaveLength(1)
    expect(JSON.parse(audits[0].after ?? '{}')).toMatchObject({ origem: 'AUTOMATICA', parameter_id: p.id })
  })

  it('ocorrência resolvida: nova NC cria outra', async () => {
    const A = await criarCenario('A'); const p = await criarParametro(A.tenant.id, A.gestor.id)
    await nc(A, p.id)
    await prisma.occurrence.updateMany({ where: { tenant_id: A.tenant.id }, data: { status: 'RESOLVED', resolved_at: new Date() } })
    await nc(A, p.id)
    expect(await contarOcorrencias(A.tenant.id)).toBe(2)
  })

  it('parâmetro diferente NÃO agrupa', async () => {
    const A = await criarCenario('A')
    const p1 = await criarParametro(A.tenant.id, A.gestor.id, 'pH')
    const p2 = await criarParametro(A.tenant.id, A.gestor.id, 'Turbidez')
    await nc(A, p1.id); await nc(A, p2.id)
    expect(await contarOcorrencias(A.tenant.id)).toBe(2)
  })

  it('E3: parâmetro de OUTRO tenant é rejeitado na ocorrência automática', async () => {
    const A = await criarCenario('A')
    const B = await criarCenario('B'); const pB = await criarParametro(B.tenant.id, B.gestor.id)
    await expect(
      prisma.$transaction((tx) => criarOcorrenciaAutomatica(tx, {
        tenantId: A.tenant.id, userId: A.operador.id, type: 'OPERATIONAL', severity: 'HIGH',
        description: 'x', collectionPointId: A.ponto.id, parameterId: pB.id, // parâmetro do tenant B
      })),
    ).rejects.toThrow(/Parâmetro inválido/)
    expect(await contarOcorrencias(A.tenant.id)).toBe(0)
  })

  it('tenant diferente NUNCA agrupa', async () => {
    const A = await criarCenario('A'); const pa = await criarParametro(A.tenant.id, A.gestor.id)
    const B = await criarCenario('B'); const pb = await criarParametro(B.tenant.id, B.gestor.id)
    await nc(A, pa.id); await nc(B, pb.id)
    expect(await contarOcorrencias(A.tenant.id)).toBe(1)
    expect(await contarOcorrencias(B.tenant.id)).toBe(1)
  })

  it('concorrência: 2 NCs simultâneas → 1 ocorrência, 2 leituras (nenhuma perdida), 1 comentário', async () => {
    const A = await criarCenario('A'); const p = await criarParametro(A.tenant.id, A.gestor.id)
    await Promise.all([nc(A, p.id, 11), nc(A, p.id, 12)])
    expect(await contarOcorrencias(A.tenant.id)).toBe(1)              // sem duplicata
    expect(await prisma.reading.count({ where: { tenant_id: A.tenant.id } })).toBe(2)  // nenhuma leitura perdida
    const occ = await prisma.occurrence.findFirst({ where: { tenant_id: A.tenant.id } })
    expect(await prisma.occurrenceComment.count({ where: { occurrence_id: occ!.id } })).toBe(1)
  })
})
