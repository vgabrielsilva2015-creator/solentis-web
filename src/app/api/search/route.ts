import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { getLogger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const tenant_id = await getTenantId()
    const query = q.toLowerCase()

    const [equipments, points, occurrences] = await Promise.all([
      // Equipamentos
      prisma.equipment.findMany({
        where: {
          tenant_id,
          OR: [
            { name: { contains: query } },
            { serial_number: { contains: query } }
          ]
        },
        take: 3,
        select: { id: true, name: true, serial_number: true }
      }),
      
      // Pontos de Coleta
      prisma.collectionPoint.findMany({
        where: {
          tenant_id,
          name: { contains: query }
        },
        take: 3,
        select: { id: true, name: true }
      }),
      
      // Ocorrencias (Abertas ou em Andamento)
      prisma.occurrence.findMany({
        where: {
          tenant_id,
          description: { contains: query }
        },
        take: 3,
        select: { id: true, category: true, description: true }
      })
    ])

    const results = [
      ...equipments.map(e => ({
        id: e.id,
        type: 'equipment',
        title: e.name,
        subtitle: e.serial_number ? `SN: ${e.serial_number}` : 'Equipamento',
        href: `/tecnico/equipamentos` // Redirecionamento genérico
      })),
      ...points.map(p => ({
        id: p.id,
        type: 'point',
        title: p.name,
        subtitle: 'Ponto de Coleta',
        href: `/gestor/dashboard?pontoId=${p.id}`
      })),
      ...occurrences.map(o => ({
        id: o.id,
        type: 'occurrence',
        title: o.category || 'Ocorrência',
        subtitle: o.description.substring(0, 50) + '...',
        href: `/gestor/ocorrencias`
      }))
    ]

    return NextResponse.json({ results })
  } catch (error) {
    const log = await getLogger({ action: 'search' })
    log.error({ err: error }, 'Erro na busca global')
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
