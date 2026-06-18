'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'

export async function getReportData(startDate: string, endDate: string) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso negado')
  }

  const tenantId = await getTenantId()
  const start = new Date(startDate)
  const end = new Date(endDate)
  // Ensure the end date covers the whole day
  end.setHours(23, 59, 59, 999)

  // 1. Leituras no período
  const readings = await prisma.reading.findMany({
    where: {
      tenant_id: tenantId,
      recorded_at: {
        gte: start,
        lte: end
      },
      parameter_id: { not: null }
    },
    include: {
      parameter: true,
      collection_point: true
    }
  })

  // Group readings by parameter
  const parameterStats: Record<string, any> = {}
  let totalNonConformant = 0

  for (const r of readings) {
    if (!r.parameter) continue
    const pid = r.parameter.id
    if (!parameterStats[pid]) {
      parameterStats[pid] = {
        name: r.parameter.name,
        unit: r.parameter.unit,
        minLimit: r.parameter.min_limit,
        maxLimit: r.parameter.max_limit,
        values: [],
        nonConformantCount: 0
      }
    }
    if (r.value !== null) {
      parameterStats[pid].values.push(r.value)
    }
    if (r.is_non_conformant) {
      parameterStats[pid].nonConformantCount++
      totalNonConformant++
    }
  }

  const consolidatedParameters = Object.values(parameterStats).map(p => {
    const vals = p.values
    const min = vals.length > 0 ? Math.min(...vals) : null
    const max = vals.length > 0 ? Math.max(...vals) : null
    const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
    return {
      name: p.name,
      unit: p.unit,
      minLimit: p.minLimit,
      maxLimit: p.maxLimit,
      min,
      max,
      avg: avg !== null ? parseFloat(avg.toFixed(2)) : null,
      nonConformantCount: p.nonConformantCount,
      totalReadings: vals.length
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // 2. Ocorrências no período
  const occurrences = await prisma.occurrence.findMany({
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: start,
        lte: end
      }
    },
    include: {
      reporter: { select: { name: true } },
      resolver: { select: { name: true } }
    },
    orderBy: { created_at: 'desc' }
  })

  // SLA Calculation
  let slaMet = 0
  let slaMissed = 0
  let openPastDeadline = 0

  for (const oc of occurrences) {
    if (oc.status === 'RESOLVED' && oc.resolved_at) {
      if (oc.resolved_at <= oc.deadline) slaMet++
      else slaMissed++
    } else {
      if (new Date() > oc.deadline) openPastDeadline++
    }
  }

  const totalOccurrences = occurrences.length
  const slaCompliance = totalOccurrences > 0 
    ? ((slaMet / totalOccurrences) * 100).toFixed(1) 
    : 100

  return {
    success: true,
    data: {
      consolidatedParameters,
      totalReadings: readings.length,
      totalNonConformant,
      occurrences: occurrences.map(o => ({
        id: o.id,
        description: o.description,
        severity: o.severity,
        status: o.status,
        createdAt: o.created_at.toISOString(),
        deadline: o.deadline.toISOString(),
        resolvedAt: o.resolved_at?.toISOString() || null,
        reporterName: o.reporter.name,
        resolverName: o.resolver?.name || null
      })),
      sla: {
        met: slaMet,
        missed: slaMissed,
        openPastDeadline,
        complianceRate: slaCompliance
      }
    }
  }
}
