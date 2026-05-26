import { PrismaClient } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

// Aceita PrismaClient direto ou um transaction client (ambos expõem auditLog)
type AuditClient = Pick<PrismaClient, 'auditLog'>

export interface LogAuditParams {
  userId:         string | null
  action:         AuditAction
  tableName:      string
  recordId:       string
  before?:        Record<string, unknown> | null
  after?:         Record<string, unknown> | null
  justification?: string | null
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
  const { userId, action, tableName, recordId, before, after, justification } = params
  await client.auditLog.create({
    data: {
      user_id:       userId       ?? null,
      action,
      table_name:    tableName,
      record_id:     recordId,
      before:        before  != null ? JSON.stringify(before)  : null,
      after:         after   != null ? JSON.stringify(after)   : null,
      justification: justification  ?? null,
    },
  })
}
