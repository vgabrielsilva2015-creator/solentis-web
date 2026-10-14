import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/web-push'
import { getLogger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import { errorStatusCode } from '@/lib/error-utils'

// O TransactionClient é o tipo que o prisma fornece dentro de um $transaction
type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/** M-08: no máximo N envios de push em paralelo por lote (não estoura o provedor). */
const CONCURRENCIA_PUSH = 10

export async function handleNewOccurrence(tx: TxClient, occurrence: {
  id: string,
  tenant_id: string,
  description: string,
  reported_by: string
}) {
  const logger = await getLogger({ action: 'handleNewOccurrence', tenantId: occurrence.tenant_id })

  try {
    // 1. Cria a Tarefa (Plano de Ação) vinculada à NC, sem turno obrigatório
    const task = await tx.shiftTask.create({
      data: {
        tenant_id: occurrence.tenant_id,
        occurrence_id: occurrence.id,
        title: `Tratar NC: ${occurrence.description.length > 50 ? occurrence.description.substring(0, 50) + '...' : occurrence.description}`,
        description: `Esta tarefa foi gerada automaticamente a partir da ocorrência: ${occurrence.description}`,
        created_by: occurrence.reported_by,
        status: 'PENDING',
        requires_photo: false,
      }
    })
    
    logger.info({ taskId: task.id }, 'Plano de ação automático criado para NC')

    // Hook pós-commit: envia os web-pushes. NUNCA lança (best-effort) e nunca derruba a
    // ocorrência já persistida. M-08: envio em lotes com Promise.allSettled (limite de
    // concorrência) + resumo contável (enviados/falhados/expirados) em log estruturado.
    return async () => {
      try {
        const managers = await prisma.user.findMany({
          where: {
            tenant_id: occurrence.tenant_id,
            role: 'MANAGER',
            is_active: true,
            receive_nc_push: true
          },
          select: { id: true, push_subscriptions: true }
        })

        const alvos = managers.flatMap((m) => m.push_subscriptions.map((sub) => ({ userId: m.id, sub })))
        if (alvos.length === 0) return

        const payload = JSON.stringify({
          title: 'Nova Não Conformidade',
          body: occurrence.description,
          url: `/gestor/ocorrencias/${occurrence.id}`
        })

        let enviados = 0, falhados = 0, expirados = 0
        for (let i = 0; i < alvos.length; i += CONCURRENCIA_PUSH) {
          const lote = alvos.slice(i, i + CONCURRENCIA_PUSH)
          const resultados = await Promise.allSettled(lote.map(async ({ userId, sub }) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
              return 'ok' as const
            } catch (err: unknown) {
              const status = errorStatusCode(err)
              if (status === 404 || status === 410) {
                // Subscription expirada: remove (falha de delete não compromete o envio)
                await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
                return 'expired' as const
              }
              logger.error({ err, userId }, 'Falha ao enviar web-push da NC')
              return 'fail' as const
            }
          }))
          for (const r of resultados) {
            if (r.status === 'fulfilled' && r.value === 'ok') enviados++
            else if (r.status === 'fulfilled' && r.value === 'expired') expirados++
            else falhados++
          }
        }

        logger.info({ enviados, falhados, expirados, total: alvos.length }, 'Push de NC concluído')
      } catch (pushErr) {
        logger.error({ err: pushErr }, 'Erro no loop de notificação web-push da NC')
      }
    }

  } catch (err) {
    // A criação da tarefa roda DENTRO da transação do chamador; propagar o erro (throw)
    // aborta a transação por completo — é o comportamento correto (não mascarar). M-08.
    logger.error({ err }, 'Erro ao rodar handleNewOccurrence')
    throw err
  }
}
