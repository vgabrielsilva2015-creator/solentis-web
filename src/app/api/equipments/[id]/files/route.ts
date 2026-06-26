import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { readUpload } from '@/lib/storage'
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
  const type = reqUrl.searchParams.get('type') // 'photo' | 'manual'

  const equipment = await prisma.equipment.findFirst({
    where: {
      id,
      tenant_id: await getTenantId(),
    },
    select: { photo_url: true, manual_url: true }
  })

  if (!equipment) {
    return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 })
  }

  const fileName = type === 'photo' ? equipment.photo_url : equipment.manual_url
  if (!fileName) {
    return NextResponse.json({ error: 'Arquivo não associado' }, { status: 404 })
  }

  // Basic mime type determination
  let mimeType = 'application/octet-stream'
  if (type === 'photo') {
    if (fileName.endsWith('.png')) mimeType = 'image/png'
    else if (fileName.endsWith('.webp')) mimeType = 'image/webp'
    else mimeType = 'image/jpeg'
  } else if (type === 'manual') {
    mimeType = 'application/pdf'
  }

  const buffer = await readUpload('equipments', fileName)
  if (!buffer) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    },
  })
}
