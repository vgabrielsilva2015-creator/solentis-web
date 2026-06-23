'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function obterDetalhesPonto(pontoId: string) {
  const session = await auth()
  if (!session) {
    throw new Error('Não autorizado')
  }
  const tenant_id = await getTenantId()

  const ponto = await prisma.collectionPoint.findFirst({
    where: { id: pontoId, tenant_id },
    select: {
      id: true,
      name: true,
      location: true,
      matrix: true,
      description: true,
    }
  })

  if (!ponto) {
    throw new Error('Ponto de coleta não encontrado')
  }

  // Busca as últimas 5 leituras e análises gravadas naquele ponto
  const [reads, analyses] = await Promise.all([
    prisma.reading.findMany({
      where: { collection_point_id: pontoId, tenant_id },
      orderBy: { recorded_at: 'desc' },
      take: 5,
      select: {
        id: true,
        value: true,
        unit: true,
        recorded_at: true,
        is_non_conformant: true,
        notes: true,
        parameter: { select: { id: true, name: true } }
      }
    }),
    prisma.analysis.findMany({
      where: { collection_point_id: pontoId, tenant_id },
      orderBy: { collected_at: 'desc' },
      take: 5,
      select: {
        id: true,
        value: true,
        unit: true,
        collected_at: true,
        is_non_conformant: true,
        report_text: true,
        parameter: { select: { id: true, name: true } }
      }
    })
  ])

  // Combina e ordena por data decrescente
  const combined = [
    ...reads.map(r => ({
      id: r.id,
      tipo: 'Campo',
      value: r.value,
      unit: r.unit,
      date: r.recorded_at,
      is_non_conformant: r.is_non_conformant,
      notes: r.notes,
      parameter: r.parameter,
    })),
    ...analyses.map(a => ({
      id: a.id,
      tipo: 'Laboratório',
      value: a.value,
      unit: a.unit,
      date: a.collected_at,
      is_non_conformant: a.is_non_conformant,
      notes: a.report_text,
      parameter: a.parameter,
    }))
  ]
  combined.sort((a, b) => b.date.getTime() - a.date.getTime())
  const ultimasLeituras = combined.slice(0, 5)

  // Encontra o parâmetro principal (com mais leituras) nesse ponto
  const parametroMaisComum = await prisma.reading.groupBy({
    by: ['parameter_id'],
    where: { collection_point_id: pontoId, tenant_id, parameter_id: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1
  })

  let sparklineData: { value: number; date: Date }[] = []
  let parameterName = 'Parâmetro'
  let limits = { min: null as number | null, max: null as number | null }

  if (parametroMaisComum.length > 0 && parametroMaisComum[0].parameter_id) {
    const paramId = parametroMaisComum[0].parameter_id
    
    // Busca as leituras dos últimos 7 dias para esse parâmetro e ponto
    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    const sparkReads = await prisma.reading.findMany({
      where: {
        collection_point_id: pontoId,
        parameter_id: paramId,
        tenant_id,
        recorded_at: { gte: seteDiasAtras }
      },
      orderBy: { recorded_at: 'asc' },
      select: {
        value: true,
        recorded_at: true,
        parameter: {
          select: {
            name: true,
            min_limit: true,
            max_limit: true,
          }
        }
      }
    })

    if (sparkReads.length > 0) {
      parameterName = sparkReads[0].parameter?.name || 'Parâmetro'
      limits.min = sparkReads[0].parameter?.min_limit || null
      limits.max = sparkReads[0].parameter?.max_limit || null
      sparklineData = sparkReads.map(r => ({
        value: r.value ?? 0,
        date: r.recorded_at,
      }))
    }
  }

  // Determinar status de conformidade atual
  const temNaoConformeRecente = await prisma.reading.findFirst({
    where: {
      collection_point_id: pontoId,
      tenant_id,
      recorded_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      is_non_conformant: true
    }
  })

  const statusConformidade = temNaoConformeRecente ? 'DANGER' : 'OK'

  return {
    ponto,
    leituras: ultimasLeituras,
    sparklineData,
    parameterName,
    limits,
    statusConformidade
  }
}
