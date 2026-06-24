import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getTenantId } from '@/lib/tenant'


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const reqUrl = new URL(_req.url)
  const indexStr = reqUrl.searchParams.get('index') || '0'
  const index = parseInt(indexStr, 10)

  const photos = await prisma.occurrencePhoto.findMany({
    where: {
      occurrence_id: id,
      tenant_id:     (await getTenantId()),
    },
    select: { filename: true, mime_type: true },
    orderBy: { uploaded_at: 'asc' }
  })

  const photo = photos[index]

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'occurrences', photo.filename)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        photo.mime_type,
        'Cache-Control':       'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado no disco' }, { status: 404 })
  }
}
