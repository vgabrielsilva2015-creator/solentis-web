import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const TENANT_ID = 'default'

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
    where:  { id, tenant_id: TENANT_ID },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'tasks', photo.filename)

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
