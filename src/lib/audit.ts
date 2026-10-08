import { PrismaClient } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

// Aceita PrismaClient direto ou um transaction client (ambos expõem auditLog)
type AuditClient = Pick<PrismaClient, 'auditLog'>

export interface LogAuditParams {
  tenantId:       string
  userId:         string | null
  action:         AuditAction
  tableName:      string
  recordId:       string
  before?:        Record<string, unknown> | null
  after?:         Record<string, unknown> | null
  justification?: string | null
  /** IP do pedido; se omitido, vem dos cabeçalhos da requisição em andamento (quando houver). */
  ip?:            string | null
}

/** IP da requisição atual (Server Action/rota); `null` fora de uma requisição (scripts, testes). */
async function ipDaRequisicao(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers')
    const { clientIp } = await import('@/lib/rate-limit')
    const ip = clientIp(await headers())
    return ip === 'unknown' ? null : ip
  } catch {
    return null
  }
}

/**
 * Grava um registro de auditoria.
 * Chamar dentro de $transaction quando a mutação principal também está numa transação,
 * ou com `prisma` diretamente quando a mutação é simples.
 */
export async function logAudit(
  client: AuditClient,
  params: LogAuditParams,
): Promise<void> {
  const { tenantId, userId, action, tableName, recordId, before, after, justification } = params
  const ip = params.ip !== undefined ? params.ip : await ipDaRequisicao()
  await client.auditLog.create({
    data: {
      tenant_id:     tenantId,
      user_id:       userId       ?? null,
      action,
      table_name:    tableName,
      record_id:     recordId,
      before:        before  != null ? JSON.stringify(before)  : null,
      after:         after   != null ? JSON.stringify(after)   : null,
      justification: justification  ?? null,
      ip_address:    ip,
    },
  })
}
