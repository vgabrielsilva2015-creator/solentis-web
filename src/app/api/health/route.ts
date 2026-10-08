import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * T-30 — Saúde do serviço, para monitor externo (UptimeRobot, Better Stack, etc.).
 *
 * Público de propósito (monitor não faz login) e por isso mínimo: só "ok"/"falha",
 * sem versão, sem nome de banco, sem detalhe do erro (o detalhe vai para o log).
 * Faz um `SELECT 1` com limite de 3 s. Nunca cacheia.
 */
export const dynamic = 'force-dynamic'

const LIMITE_MS = 3000

export async function GET() {
  const inicio = performance.now()
  let relogio: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, rej) => { relogio = setTimeout(() => rej(new Error('timeout do banco')), LIMITE_MS) }),
    ])
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    logger.error({ err, action: 'health', durationMs: Math.round(performance.now() - inicio) }, 'Health check falhou')
    return NextResponse.json({ status: 'falha' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  } finally {
    clearTimeout(relogio)
  }
}
