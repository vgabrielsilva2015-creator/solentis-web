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

  const photo = await prisma.shiftTaskPhoto.findFirst({
    where:  { id, tenant_id: (await getTenantId()) },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const buffer = await readUpload('tasks', photo.filename)
  if (!buffer) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        photo.mime_type,
      'Cache-Control':       'private, max-age=3600',
      'Content-Disposition': 'inline',
    },
  })
}
