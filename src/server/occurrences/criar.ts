/**
 * M-06 — caminho único de criação de ocorrência AUTOMÁTICA (não-conformidade).
 *
 * Antes havia 3 blocos quase iguais (leitura fora de faixa, análise não conforme e
 * laudo importado) com regras divergentes: tipo, ponto de coleta e disparo de
 * notificação não batiam. Agora os três chamam `criarOcorrenciaAutomatica`.
 *
 * Contrato (por que é seguro):
 *  - roda DENTRO da transação do chamador (recebe `tx`): a ocorrência e a tarefa-plano
 *    só existem se a transação der commit; em rollback, nada fica;
 *  - devolve o hook de notificação (push aos gestores) SEM dispará-lo — quem fecha a
 *    transação roda o hook DEPOIS do commit, então rollback nunca notifica e não há
 *    envio duplicado;
 *  - o ponto de coleta é VALIDADO contra o tenant; não se inventa vínculo.
 */
import { Prisma } from '@prisma/client'
import { handleNewOccurrence } from '@/lib/occurrences'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppAlert } from '@/lib/whatsapp'
import { getLogger } from '@/lib/logger'

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/** Prazo usado quando não há `occurrence_severity_defaults` configurado para a severidade (M-06 / D1). */
export const FALLBACK_DEADLINE_HOURS = 24

export type OcorrenciaOrigem = 'OPERATIONAL' | 'LABORATORY' | 'EQUIPMENT' | 'ENVIRONMENTAL' | 'SAFETY'
export type OcorrenciaSeveridade = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const ORIGENS: readonly OcorrenciaOrigem[] = ['OPERATIONAL', 'LABORATORY', 'EQUIPMENT', 'ENVIRONMENTAL', 'SAFETY']
const SEVERIDADES: readonly OcorrenciaSeveridade[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export interface CriarOcorrenciaParams {
  tenantId: string
  userId: string
  type: OcorrenciaOrigem
  severity: OcorrenciaSeveridade
  description: string
  /** Ponto de coleta da NC. Obrigatório e validado contra o tenant. */
  collectionPointId: string
}

/** Prazo = agora + horas configuradas para a severidade (ou o fallback de 24h). */
export async function resolverPrazo(tx: TxClient, tenantId: string, severity: OcorrenciaSeveridade): Promise<Date> {
  const padrao = await tx.occurrenceSeverityDefault.findUnique({
    where: { tenant_id_severity: { tenant_id: tenantId, severity } },
  })
  const prazo = new Date()
  prazo.setHours(prazo.getHours() + (padrao?.deadline_hours || FALLBACK_DEADLINE_HOURS))
  return prazo
}

/**
 * Cria a ocorrência automática + a tarefa-plano (via handleNewOccurrence), dentro da
 * transação `tx`. Devolve o hook de notificação pós-commit (ou `null`): o chamador deve
 * rodá-lo APÓS o commit da transação.
 */
export async function criarOcorrenciaAutomatica(
  tx: TxClient,
  params: CriarOcorrenciaParams,
): Promise<(() => Promise<void>) | null> {
  const { tenantId, userId, type, severity, description, collectionPointId } = params

  if (!tenantId || !userId) throw new Error('Ocorrência automática exige tenant e usuário.')
  if (!ORIGENS.includes(type)) throw new Error(`Tipo de ocorrência inválido: ${type}`)
  if (!SEVERIDADES.includes(severity)) throw new Error(`Severidade inválida: ${severity}`)

  // Valida o ponto de coleta contra o tenant — não inventa vínculo.
  const ponto = await tx.collectionPoint.findFirst({
    where: { id: collectionPointId, tenant_id: tenantId },
    select: { id: true, name: true },
  })
  if (!ponto) throw new Error('Ponto de coleta inválido ou de outra planta para a ocorrência automática.')

  const deadline = await resolverPrazo(tx, tenantId, severity)

  const ocorrencia = await tx.occurrence.create({
    data: {
      tenant_id: tenantId,
      description,
      severity,
      status: 'OPEN',
      type,
      deadline,
      reported_by: userId,
      collection_point_id: collectionPointId,
    },
  })

  // Hook de push dos gestores (criado na mesma transação; disparado pós-commit).
  const pushHook = await handleNewOccurrence(tx, ocorrencia)

  // Compõe o hook pós-commit: push + (WhatsApp quando ALTA/CRÍTICA), reusando o mesmo
  // critério de destinatário do fluxo manual (gestor do tenant com telefone). Tudo
  // roda DEPOIS do commit — rollback nunca notifica — e falhas não derrubam a ocorrência.
  const alertarWhats = severity === 'HIGH' || severity === 'CRITICAL'
  return async () => {
    await pushHook()
    if (alertarWhats) await alertarGestoresWhatsApp(tenantId, severity, description, ponto.name)
  }
}

/**
 * Alerta por WhatsApp os gestores do tenant com telefone cadastrado (best-effort).
 * Reusa `sendWhatsAppAlert` (uma tentativa, sem retry, não lança). Falhas são apenas
 * registradas: a ocorrência já está persistida e não é afetada. Não há, hoje, opt-out
 * de WhatsApp (mesmo critério do fluxo manual).
 */
async function alertarGestoresWhatsApp(
  tenantId: string,
  severity: OcorrenciaSeveridade,
  description: string,
  pontoNome: string | null,
): Promise<void> {
  try {
    const gestores = await prisma.user.findMany({
      where: { tenant_id: tenantId, role: 'MANAGER', phone: { not: null } },
      select: { phone: true },
    })
    if (gestores.length === 0) return
    const sev = severity === 'CRITICAL' ? 'CRÍTICA' : 'ALTA'
    const local = pontoNome ? ` no local: ${pontoNome}` : ''
    const msg = `🚨 *Alerta Solentis*\nNova Não Conformidade *${sev}*${local}\n\n*Descrição:* ${description}\n\nAcesse o painel para mais detalhes.`
    await Promise.allSettled(gestores.map((g) => sendWhatsAppAlert(g.phone!, msg)))
  } catch (err) {
    const logger = await getLogger({ action: 'criarOcorrenciaAutomatica.whatsapp', tenantId })
    logger.error({ err }, 'Falha ao alertar gestores por WhatsApp (NC automática)')
  }
}
