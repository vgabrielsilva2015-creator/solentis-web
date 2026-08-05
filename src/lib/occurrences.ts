import { prisma } from '@/lib/prisma'
import { webpush } from '@/lib/web-push'
import { getLogger } from '@/lib/logger'
import { Prisma } from '@prisma/client'

// O TransactionClient é o tipo que o prisma fornece dentro de um $transaction
type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

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

        const payload = JSON.stringify({
          title: 'Nova Não Conformidade',
          body: occurrence.description,
          url: `/gestor/ocorrencias/${occurrence.id}`
        })

        for (const manager of managers) {
          for (const sub of manager.push_subscriptions) {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
              }, payload)
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                // Subscription expirada
                await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } })
              } else {
                logger.error({ err, userId: manager.id }, 'Falha ao enviar web-push da NC')
              }
            }
          }
        }
      } catch (pushErr) {
        logger.error({ err: pushErr }, 'Erro no loop de notificação web-push da NC')
      }
    }

  } catch (err) {
    logger.error({ err }, 'Erro ao rodar handleNewOccurrence')
    throw err
  }
}
