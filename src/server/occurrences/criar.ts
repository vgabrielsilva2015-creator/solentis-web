/**
 * M-06/M-07 — caminho único de criação de ocorrência AUTOMÁTICA (não-conformidade).
 *
 * Os três fluxos (leitura fora de faixa, análise não conforme e laudo importado)
 * chamam `criarOcorrenciaAutomatica`, que unifica tipo, ponto, prazo e notificação.
 *
 * Contrato (por que é seguro):
 *  - roda DENTRO da transação do chamador (recebe `tx`): ocorrência e tarefa-plano só
 *    existem se a transação der commit; em rollback, nada fica;
 *  - devolve o hook de notificação SEM dispará-lo — quem fecha a transação roda o hook
 *    DEPOIS do commit, então rollback nunca notifica e não há envio duplicado;
 *  - o ponto de coleta é VALIDADO contra o tenant; não se inventa vínculo.
 *
 * M-07 — deduplicação de reincidências:
 *  - um `pg_advisory_xact_lock` por (tenant, ponto, parâmetro) SERIALIZA NCs simultâneas
 *    do mesmo problema (a 2ª espera a 1ª commitar), então "busca-aberta → senão cria" é
 *    seguro sem P2002 (que abortaria a transação do chamador e perderia a leitura);
 *  - se já existe ocorrência NÃO resolvida do mesmo (tenant, ponto, parâmetro), registra a
 *    reincidência como comentário e NÃO cria nova ocorrência/tarefa/notificação — só escala
 *    a severidade (+ alerta prioritário) se a nova for mais grave;
 *  - a guarda única parcial `uniq_ocorrencia_aberta_ponto_param` é a rede de segurança.
 */
import { Prisma } from '@prisma/client'
import { handleNewOccurrence } from '@/lib/occurrences'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppAlert } from '@/lib/whatsapp'
import { getLogger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'

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
const RANK_SEVERIDADE: Record<OcorrenciaSeveridade, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
/** Namespace do advisory lock de deduplicação de ocorrências (evita colidir com outros locks). */
const DEDUP_LOCK_NS = 4207

export interface CriarOcorrenciaParams {
  tenantId: string
  userId: string
  type: OcorrenciaOrigem
  severity: OcorrenciaSeveridade
  description: string
  /** Ponto de coleta da NC. Obrigatório e validado contra o tenant. */
  collectionPointId: string
  /** Parâmetro da NC. Obrigatório (M-07): é a chave da deduplicação, junto do ponto. */
  parameterId: string
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
  const { tenantId, userId, type, severity, description, collectionPointId, parameterId } = params

  if (!tenantId || !userId) throw new Error('Ocorrência automática exige tenant e usuário.')
  if (!parameterId) throw new Error('Ocorrência automática exige parâmetro (chave da deduplicação).')
  if (!ORIGENS.includes(type)) throw new Error(`Tipo de ocorrência inválido: ${type}`)
  if (!SEVERIDADES.includes(severity)) throw new Error(`Severidade inválida: ${severity}`)

  // Valida o ponto de coleta contra o tenant — não inventa vínculo.
  const ponto = await tx.collectionPoint.findFirst({
    where: { id: collectionPointId, tenant_id: tenantId },
    select: { id: true, name: true },
  })
  if (!ponto) throw new Error('Ponto de coleta inválido ou de outra planta para a ocorrência automática.')

  // E3: revalida o parâmetro contra o tenant (ele é a chave da deduplicação — M-07).
  // Torna a função auto-suficiente: nenhum chamador pode injetar parâmetro de outra planta.
  const parametro = await tx.qualityParameter.findFirst({
    where: { id: parameterId, tenant_id: tenantId },
    select: { id: true },
  })
  if (!parametro) throw new Error('Parâmetro inválido ou de outra planta para a ocorrência automática.')

  // M-07: serializa NCs simultâneas do mesmo (tenant, ponto, parâmetro). A 2ª espera a 1ª
  // commitar — então a busca abaixo enxerga a ocorrência já criada e vira comentário, sem
  // corrida de criação (sem P2002 abortando a transação do chamador). Lock solto no commit.
  const chaveLock = `${tenantId}|${collectionPointId}|${parameterId}`
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEDUP_LOCK_NS}::int, hashtext(${chaveLock}))`

  // Já existe ocorrência NÃO resolvida do mesmo problema? Então é reincidência: agrupa.
  const aberta = await tx.occurrence.findFirst({
    where: {
      tenant_id: tenantId,
      collection_point_id: collectionPointId,
      parameter_id: parameterId,
      status: { not: 'RESOLVED' },
    },
    select: { id: true, severity: true },
    orderBy: { created_at: 'desc' },
  })
  if (aberta) {
    return agruparReincidencia(tx, { abertaId: aberta.id, abertaSeveridade: aberta.severity as OcorrenciaSeveridade, tenantId, userId, type, severity, description, pontoNome: ponto.name })
  }

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
      parameter_id: parameterId,
    },
  })

  // E2 — rastreabilidade: a ocorrência automática nasce auditada (como a manual).
  await logAudit(tx, {
    tenantId, userId, action: 'CREATE',
    tableName: 'occurrences', recordId: ocorrencia.id,
    after: { origem: 'AUTOMATICA', type, severity, status: 'OPEN', collection_point_id: collectionPointId, parameter_id: parameterId },
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

const ORIGEM_LABEL: Record<OcorrenciaOrigem, string> = {
  OPERATIONAL: 'leitura de campo', LABORATORY: 'análise/laudo',
  EQUIPMENT: 'equipamento', ENVIRONMENTAL: 'ambiental', SAFETY: 'segurança',
}

/**
 * M-07: reincidência de uma NC já aberta. Registra um comentário (valor/origem/horário via
 * `description` + `created_at`), NÃO cria nova ocorrência/tarefa/notificação normal. Se a nova
 * detecção for mais grave, ESCALA a severidade e devolve um hook de alerta prioritário.
 */
async function agruparReincidencia(
  tx: TxClient,
  p: {
    abertaId: string; abertaSeveridade: OcorrenciaSeveridade; tenantId: string; userId: string
    type: OcorrenciaOrigem; severity: OcorrenciaSeveridade; description: string; pontoNome: string | null
  },
): Promise<(() => Promise<void>) | null> {
  const comentario = await tx.occurrenceComment.create({
    data: {
      occurrence_id: p.abertaId,
      user_id: p.userId,
      text: `Reincidência (${ORIGEM_LABEL[p.type]}): ${p.description}`,
    },
  })

  // E2 — rastreabilidade: a reincidência deixa rastro (mesmo sem escalar).
  await logAudit(tx, {
    tenantId: p.tenantId, userId: p.userId, action: 'CREATE',
    tableName: 'occurrence_comments', recordId: comentario.id,
    after: { tipo: 'reincidencia', ocorrencia_id: p.abertaId, origem: p.type, severidade_detectada: p.severity },
  })

  const escala = RANK_SEVERIDADE[p.severity] > RANK_SEVERIDADE[p.abertaSeveridade]
  if (!escala) return null // reincidência comum: sem nova tarefa, sem notificação

  // Escalonamento: a ocorrência aberta evoluiu para uma severidade maior.
  await tx.occurrence.updateMany({
    where: { id: p.abertaId, tenant_id: p.tenantId },
    data: { severity: p.severity },
  })
  // E2 — rastreabilidade: quem/quando/por que a severidade mudou (before/after).
  await logAudit(tx, {
    tenantId: p.tenantId, userId: p.userId, action: 'UPDATE',
    tableName: 'occurrences', recordId: p.abertaId,
    before: { severity: p.abertaSeveridade },
    after: { severity: p.severity, motivo: 'escalonamento por reincidência' },
  })
  // Alerta prioritário (pós-commit): WhatsApp aos gestores com a nova severidade.
  return async () => {
    await alertarGestoresWhatsApp(p.tenantId, p.severity, `Severidade elevada para ${p.severity}. ${p.description}`, p.pontoNome)
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
  const logger = await getLogger({ action: 'criarOcorrenciaAutomatica.whatsapp', tenantId })
  try {
    const gestores = await prisma.user.findMany({
      where: { tenant_id: tenantId, role: 'MANAGER', phone: { not: null } },
      select: { phone: true },
    })
    if (gestores.length === 0) return
    const sev = severity === 'CRITICAL' ? 'CRÍTICA' : 'ALTA'
    const local = pontoNome ? ` no local: ${pontoNome}` : ''
    const msg = `🚨 *Alerta Solentis*\nNova Não Conformidade *${sev}*${local}\n\n*Descrição:* ${description}\n\nAcesse o painel para mais detalhes.`
    const resultados = await Promise.allSettled(gestores.map((g) => sendWhatsAppAlert(g.phone!, msg)))
    // M-08: resumo contável (sendWhatsAppAlert devolve true/false e nunca lança).
    let enviados = 0, falhados = 0
    for (const r of resultados) {
      if (r.status === 'fulfilled' && r.value) enviados++
      else falhados++
    }
    logger.info({ enviados, falhados, total: gestores.length }, 'WhatsApp de NC concluído')
  } catch (err) {
    logger.error({ err }, 'Falha ao alertar gestores por WhatsApp (NC automática)')
  }
}
