import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLogger } from '@/lib/logger'
import { allowedTypes, excerpt, hrefFor, likePattern, type SearchHit } from '@/lib/search'

const POR_TIPO = 5

// T-17: sem diferenciar maiúsculas/acentos (f_unaccent + lower, mesma expressão
// dos índices de trigrama previstos), só o que o perfil pode ver, com link para
// a tela do próprio perfil.
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { role, tenantId } = session.user

  const padrao = likePattern(new URL(request.url).searchParams.get('q') ?? '')
  const tipos = allowedTypes(role)
  if (!padrao || tipos.length === 0) return NextResponse.json({ results: [] })

  try {
    const busca = (coluna: Prisma.Sql) => Prisma.sql`public.f_unaccent(lower(${coluna})) LIKE public.f_unaccent(lower(${padrao})) ESCAPE '\\'`

    const [equipamentos, pontos, ocorrencias] = await Promise.all([
      tipos.includes('equipment')
        ? prisma.$queryRaw<Array<{ id: string; name: string; serial_number: string | null }>>(Prisma.sql`
            SELECT id, name, serial_number FROM equipment
            WHERE tenant_id = ${tenantId}
              AND (${busca(Prisma.sql`name`)} OR ${busca(Prisma.sql`coalesce(serial_number, '')`)})
            ORDER BY is_active DESC, name LIMIT ${POR_TIPO}`)
        : [],
      tipos.includes('point')
        ? prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
            SELECT id, name FROM collection_points
            WHERE tenant_id = ${tenantId} AND ${busca(Prisma.sql`name`)}
            ORDER BY is_active DESC, name LIMIT ${POR_TIPO}`)
        : [],
      tipos.includes('occurrence')
        ? prisma.$queryRaw<Array<{ id: string; category: string | null; description: string; status: string }>>(Prisma.sql`
            SELECT id, category, description, status FROM occurrences
            WHERE tenant_id = ${tenantId}
              AND (${busca(Prisma.sql`description`)} OR ${busca(Prisma.sql`coalesce(category, '')`)})
            ORDER BY created_at DESC LIMIT ${POR_TIPO}`)
        : [],
    ])

    const results: SearchHit[] = [
      ...equipamentos.map((e) => ({ id: e.id, type: 'equipment' as const, title: e.name, subtitle: e.serial_number ? `Equipamento · SN ${e.serial_number}` : 'Equipamento', href: hrefFor(role, 'equipment', e.id)! })),
      ...pontos.map((p) => ({ id: p.id, type: 'point' as const, title: p.name, subtitle: 'Ponto de coleta', href: hrefFor(role, 'point', p.id)! })),
      ...ocorrencias.map((o) => ({ id: o.id, type: 'occurrence' as const, title: o.category || 'Ocorrência', subtitle: excerpt(o.description), href: hrefFor(role, 'occurrence', o.id)! })),
    ]
    return NextResponse.json({ results })
  } catch (error) {
    const log = await getLogger({ action: 'search', tenantId })
    log.error({ err: error }, 'Erro na busca global')
    return NextResponse.json({ error: 'Não foi possível buscar agora.' }, { status: 500 })
  }
}
