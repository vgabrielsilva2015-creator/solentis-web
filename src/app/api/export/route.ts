import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const tenantId = await getTenantId()

  let csv = ''
  let filename = ''

  if (type === 'occurrences') {
    const statusFilter = searchParams.get('status')
    const showAll = statusFilter === 'all'

    const where = {
      tenant_id: tenantId,
      ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
    }

    const occurrences = await prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        collection_point: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    const headers = ['ID', 'Data Criação', 'Severidade', 'Categoria', 'Ponto de Coleta', 'Status', 'Prazo', 'Reportado por', 'Descrição']
    csv += headers.join(';') + '\n'

    for (const oc of occurrences) {
      const row = [
        oc.id,
        oc.created_at.toISOString(),
        oc.severity,
        oc.category ?? '',
        oc.collection_point?.name ?? '',
        oc.status,
        oc.deadline.toISOString(),
        oc.reporter.name,
        `"${oc.description.replace(/"/g, '""')}"`
      ]
      csv += row.join(';') + '\n'
    }

    filename = `ocorrencias_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'readings') {
    // Add logic for readings if needed
    const readings = await prisma.reading.findMany({
      where: { tenant_id: tenantId },
      include: {
        recorder: { select: { name: true } },
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take: 1000 // Limit to prevent massive loads
    })

    const headers = ['Data', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme']
    csv += headers.join(';') + '\n'

    for (const r of readings) {
      const row = [
        r.recorded_at.toISOString(),
        r.collection_point.name,
        r.parameter?.name ?? '',
        r.value ?? '',
        r.parameter?.unit ?? r.unit ?? '',
        r.recorder.name,
        r.is_non_conformant ? 'SIM' : 'NÃO'
      ]
      csv += row.join(';') + '\n'
    }

    filename = `leituras_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'analyses') {
    const analyses = await prisma.analysis.findMany({
      where: { tenant_id: tenantId },
      include: {
        recorder: { select: { name: true } },
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } },
      },
      orderBy: { collected_at: 'desc' },
      take: 1000
    })

    const headers = ['Data Coleta', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme']
    csv += headers.join(';') + '\n'

    for (const a of analyses) {
      const row = [
        a.collected_at.toISOString(),
        a.collection_point.name,
        a.parameter.name,
        a.value ?? '',
        a.parameter.unit,
        a.recorder.name,
        a.is_non_conformant ? 'SIM' : 'NÃO'
      ]
      csv += row.join(';') + '\n'
    }

    filename = `analises_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'preventives') {
    const maintenances = await prisma.preventiveMaintenance.findMany({
      where: { tenant_id: tenantId },
      include: {
        equipment: { select: { name: true, serial_number: true } },
        completer: { select: { name: true } },
      },
      orderBy: { scheduled_date: 'desc' },
      take: 1000
    })

    const headers = ['ID', 'Equipamento', 'Serial', 'Data Agendada', 'Data Conclusão', 'Status', 'Responsável', 'Notas']
    csv += headers.join(';') + '\n'

    for (const m of maintenances) {
      const row = [
        m.id,
        `"${m.equipment.name}"`,
        m.equipment.serial_number ?? '',
        m.scheduled_date.toISOString(),
        m.completed_at ? m.completed_at.toISOString() : '',
        m.status,
        m.completer?.name ?? '',
        m.completion_notes ? `"${m.completion_notes.replace(/"/g, '""')}"` : ''
      ]
      csv += row.join(';') + '\n'
    }

    filename = `preventivas_${new Date().toISOString().slice(0, 10)}.csv`
  } else if (type === 'external_analyses') {
    const external = await prisma.externalAnalysis.findMany({
      where: { tenant_id: tenantId },
      include: {
        collector: { select: { name: true } },
        collection_point: { select: { name: true } },
        parameter: { select: { name: true, unit: true } },
      },
      orderBy: { collected_at: 'desc' },
      take: 1000
    })

    const headers = ['ID', 'Data Coleta', 'Laboratório', 'Laudo', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Coletado por', 'Status', 'Não Conforme']
    csv += headers.join(';') + '\n'

    for (const a of external) {
      const row = [
        a.id,
        a.collected_at.toISOString(),
        a.laboratory_name ?? '',
        a.laudo_number ?? '',
        a.collection_point.name,
        a.parameter.name,
        a.value ?? '',
        a.parameter.unit,
        a.collector.name,
        a.status === 'COMPLETED' ? 'CONCLUÍDO' : 'AGUARDANDO LAUDO',
        a.is_non_conformant ? 'SIM' : (a.is_non_conformant === false ? 'NÃO' : '')
      ]
      csv += row.join(';') + '\n'
    }

    filename = `laudos_externos_${new Date().toISOString().slice(0, 10)}.csv`
  } else {
    return new NextResponse('Invalid type', { status: 400 })
  }

  // Use BOM for Excel to recognize UTF-8 correctly
  const bom = '\uFEFF'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
