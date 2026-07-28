import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getLogger } from '@/lib/logger'
import { auth } from '@/lib/auth'

// Corpo validado: nível restrito, mensagem/erro truncados. O `context` do cliente
// é uma allowlist de chaves conhecidas (strings truncadas) — sem spread cru, para
// que o cliente não forje campos estruturados (userId/tenantId/action) nem
// injete/spammeie os logs.
const bodySchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'fatal']).default('error'),
  message: z.string().max(2000).optional(),
  err: z.unknown().optional(),
  // Chaves livres, mas valores primitivos e limitados (sem objetos aninhados
  // gigantes que virariam vetor de spam). Nunca é espalhado no logger — vai
  // aninhado em `clientContext`, então não sobrescreve userId/tenantId/action.
  context: z
    .record(
      z.string().max(64),
      z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const { level, message, err, context } = parsed.data

    // Contexto é sempre derivado do servidor; o cliente não sobrescreve estes campos.
    const log = await getLogger({
      userId: session?.user?.id ?? 'anonymous',
      tenantId: session?.user?.tenantId ?? 'unknown',
      action: 'client-log',
    })

    const payload = {
      err,
      clientContext: context ?? {},
      source: 'client-side',
      userAgent: request.headers.get('user-agent'),
    }

    const msg = message || 'Client-side log'
    if (level === 'fatal') log.fatal(payload, msg)
    else if (level === 'error') log.error(payload, msg)
    else if (level === 'warn') log.warn(payload, msg)
    else log.info(payload, msg)

    return NextResponse.json({ success: true })
  } catch (err) {
    const fallbackLog = await getLogger({ action: 'api-logs-fail' })
    fallbackLog.error({ err }, 'Failed to process client-side log')
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
