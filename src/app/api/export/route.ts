import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { NextResponse } from 'next/server'
import { can } from '@/server/auth/permissions'
import { csvStream, lerPeriodo, type FonteCsv, type Periodo } from '@/lib/export-csv'

// T-22: período obrigatório (máx. 366 dias) e resposta em partes. Antes: ocorrências sem limite
// (tabela inteira na memória) e as demais cortadas em silêncio em 1000 linhas.

type Fonte = { arquivo: string; fonte: FonteCsv<{ id: string }> }

// Dentro de cada fonte, TODA consulta filtra por tenant_id e pelo período.
function fonteDoTipo(type: string, tenantId: string, p: Periodo, status: string | null): Fonte | null {
  const intervalo = { gte: p.from, lt: p.to }
  const arquivo = (nome: string) => `${nome}_${p.fromStr}_a_${p.toStr}.csv`

  if (type === 'occurrences') {
    const where = { tenant_id: tenantId, created_at: intervalo, ...(status === 'all' ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }) }
    return {
      arquivo: arquivo('ocorrencias'),
      fonte: {
        headers: ['ID', 'Data Criação', 'Severidade', 'Categoria', 'Ponto de Coleta', 'Status', 'Prazo', 'Reportado por', 'Descrição'],
        pagina: (cursor, take) => prisma.occurrence.findMany({
          where, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { reporter: { select: { name: true } }, collection_point: { select: { name: true } } },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        }),
        linha: (o) => {
          const oc = o as Awaited<ReturnType<typeof prisma.occurrence.findMany<{ include: { reporter: { select: { name: true } }; collection_point: { select: { name: true } } } }>>>[number]
          return [oc.id, oc.created_at.toISOString(), oc.severity, oc.category ?? '', oc.collection_point?.name ?? '', oc.status, oc.deadline.toISOString(), oc.reporter.name, oc.description]
        },
      },
    }
  }
  if (type === 'readings') {
    return {
      arquivo: arquivo('leituras'),
      fonte: {
        headers: ['Data', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme'],
        pagina: (cursor, take) => prisma.reading.findMany({
          where: { tenant_id: tenantId, recorded_at: intervalo }, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { recorder: { select: { name: true } }, collection_point: { select: { name: true } }, parameter: { select: { name: true, unit: true } } },
          orderBy: [{ recorded_at: 'desc' }, { id: 'desc' }],
        }),
        linha: (x) => {
          const r = x as Awaited<ReturnType<typeof prisma.reading.findMany<{ include: { recorder: { select: { name: true } }; collection_point: { select: { name: true } }; parameter: { select: { name: true; unit: true } } } }>>>[number]
          return [r.recorded_at.toISOString(), r.collection_point.name, r.parameter?.name ?? '', r.value ?? '', r.parameter?.unit ?? r.unit ?? '', r.recorder.name, r.is_non_conformant ? 'SIM' : 'NÃO']
        },
      },
    }
  }
  if (type === 'analyses') {
    return {
      arquivo: arquivo('analises'),
      fonte: {
        headers: ['Data Coleta', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Registrado por', 'Não Conforme'],
        pagina: (cursor, take) => prisma.analysis.findMany({
          where: { tenant_id: tenantId, collected_at: intervalo }, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { recorder: { select: { name: true } }, collection_point: { select: { name: true } }, parameter: { select: { name: true, unit: true } } },
          orderBy: [{ collected_at: 'desc' }, { id: 'desc' }],
        }),
        linha: (x) => {
          const a = x as Awaited<ReturnType<typeof prisma.analysis.findMany<{ include: { recorder: { select: { name: true } }; collection_point: { select: { name: true } }; parameter: { select: { name: true; unit: true } } } }>>>[number]
          return [a.collected_at.toISOString(), a.collection_point.name, a.parameter.name, a.value ?? '', a.parameter.unit, a.recorder.name, a.is_non_conformant ? 'SIM' : 'NÃO']
        },
      },
    }
  }
  if (type === 'preventives') {
    return {
      arquivo: arquivo('preventivas'),
      fonte: {
        headers: ['ID', 'Equipamento', 'Serial', 'Data Agendada', 'Data Conclusão', 'Status', 'Responsável', 'Notas'],
        pagina: (cursor, take) => prisma.preventiveMaintenance.findMany({
          where: { tenant_id: tenantId, scheduled_date: intervalo }, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { equipment: { select: { name: true, serial_number: true } }, completer: { select: { name: true } } },
          orderBy: [{ scheduled_date: 'desc' }, { id: 'desc' }],
        }),
        linha: (x) => {
          const m = x as Awaited<ReturnType<typeof prisma.preventiveMaintenance.findMany<{ include: { equipment: { select: { name: true; serial_number: true } }; completer: { select: { name: true } } } }>>>[number]
          return [m.id, m.equipment.name, m.equipment.serial_number ?? '', m.scheduled_date.toISOString(), m.completed_date ? m.completed_date.toISOString() : '', m.status, m.completer?.name ?? '', m.notes ?? '']
        },
      },
    }
  }
  if (type === 'external_analyses') {
    return {
      arquivo: arquivo('laudos_externos'),
      fonte: {
        headers: ['ID', 'Data Coleta', 'Laboratório', 'Laudo', 'Ponto', 'Parâmetro', 'Valor', 'Unidade', 'Coletado por', 'Status', 'Não Conforme'],
        pagina: (cursor, take) => prisma.externalAnalysis.findMany({
          where: { tenant_id: tenantId, collected_at: intervalo }, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { collector: { select: { name: true } }, collection_point: { select: { name: true } }, parameter: { select: { name: true, unit: true } } },
          orderBy: [{ collected_at: 'desc' }, { id: 'desc' }],
        }),
        linha: (x) => {
          const a = x as Awaited<ReturnType<typeof prisma.externalAnalysis.findMany<{ include: { collector: { select: { name: true } }; collection_point: { select: { name: true } }; parameter: { select: { name: true; unit: true } } } }>>>[number]
          return [a.id, a.collected_at.toISOString(), a.laboratory_name ?? '', a.laudo_number ?? '', a.collection_point.name, a.parameter.name, a.value ?? '', a.parameter.unit, a.collector.name,
            a.status === 'COMPLETED' ? 'CONCLUÍDO' : 'AGUARDANDO LAUDO', a.is_non_conformant ? 'SIM' : (a.is_non_conformant === false ? 'NÃO' : '')]
        },
      },
    }
  }
  return null
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  if (!can(session.user.role, 'data.export')) return new NextResponse('Forbidden', { status: 403 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? ''
  const { periodo, erro } = lerPeriodo(searchParams.get('from'), searchParams.get('to'))
  if (!periodo) return new NextResponse(erro, { status: 400 })

  const tenantId = await getTenantId()
  const f = fonteDoTipo(type, tenantId, periodo, searchParams.get('status'))
  if (!f) return new NextResponse('Invalid type', { status: 400 })

  return new NextResponse(csvStream(f.fonte), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${f.arquivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
