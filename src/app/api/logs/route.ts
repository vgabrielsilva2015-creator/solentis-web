import { NextResponse } from 'next/server'
import { getLogger } from '@/lib/logger'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    
    // Fallback context caso o cliente mande payload sem contexto
    const userId = session?.user?.id ?? 'anonymous'
    const tenantId = session?.user?.tenantId ?? 'unknown'
    
    const { level = 'error', message, err, context } = body

    const log = await getLogger({
      userId,
      tenantId,
      action: 'client-log',
      ...context,
    })

    const payload = {
      err,
      source: 'client-side',
      userAgent: request.headers.get('user-agent'),
    }

    if (level === 'fatal') {
      log.fatal(payload, message || 'Client-side fatal error')
    } else if (level === 'error') {
      log.error(payload, message || 'Client-side error')
    } else if (level === 'warn') {
      log.warn(payload, message || 'Client-side warning')
    } else {
      log.info(payload, message || 'Client-side info')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // Se o próprio endpoint de log falhar, loga via pino diretamente
    const fallbackLog = await getLogger({ action: 'api-logs-fail' })
    fallbackLog.error({ err }, 'Failed to process client-side log')
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
