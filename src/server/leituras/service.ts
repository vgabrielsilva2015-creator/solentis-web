/**
 * Regras da leitura de campo (T-25). Sem sessão, sem FormData, sem revalidatePath.
 * A action autentica, valida a entrada, trata a foto e atualiza as telas; aqui ficam:
 * idempotência por `client_id` (T-15), conferência de ponto/parâmetro do tenant,
 * cálculo de não conformidade, vínculo ao turno de quem registrou (T-18) e a
 * ocorrência automática quando o valor está fora da faixa.
 */
import { prisma } from '@/lib/prisma'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { handleNewOccurrence } from '@/lib/occurrences'

function violacaoDeUnicidade(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002'
}

/** T-15: já existe leitura deste aparelho com este client_id? (reenvio da fila offline, duplo toque) */
export async function leituraJaRegistrada(tenantId: string, clientId: string | null): Promise<boolean> {
  if (!clientId) return false
  const existente = await prisma.reading.findUnique({
    where: { tenant_id_client_id: { tenant_id: tenantId, client_id: clientId } },
    select: { id: true },
  })
  return existente !== null
}

export type Referencias =
  | { ok: true; unit: string | null; paramName: string | null; isNonConformant: boolean | null }
  | { ok: false; error: string }

/** Confere que ponto e parâmetro são do tenant e calcula a não conformidade. */
export async function resolverReferencias(i: {
  tenantId: string; collectionPointId: string; parameterId: string | null; value: number | null; unit: string | null
}): Promise<Referencias> {
  const ponto = await prisma.collectionPoint.findFirst({
    where: { id: i.collectionPointId, tenant_id: i.tenantId },
    select: { id: true },
  })
  if (!ponto) return { ok: false, error: 'Ponto de coleta inválido ou não autorizado.' }
  if (!i.parameterId) return { ok: true, unit: i.unit, paramName: null, isNonConformant: null }

  const param = await prisma.qualityParameter.findFirst({
    where: { id: i.parameterId, tenant_id: i.tenantId },
    select: { name: true, min_limit: true, max_limit: true, unit: true },
  })
  if (!param) return { ok: false, error: 'Parâmetro inválido ou não autorizado.' }
  return {
    ok: true,
    // copia a unidade do parâmetro quando o formulário não enviou uma
    unit: i.unit ?? param.unit,
    paramName: param.name,
    isNonConformant: calcularNaoConformidade(i.value, param.min_limit, param.max_limit),
  }
}

export interface NovaLeitura {
  tenantId: string; userId: string; collectionPointId: string; parameterId: string | null
  value: number | null; unit: string | null; notes: string | null; recordedAt: Date
  clientId: string | null; photoFilename: string | null
  isNonConformant: boolean | null; paramName: string | null
}

/** Grava a leitura (e a ocorrência automática, se fora da faixa). Devolve `duplicate` no reenvio simultâneo. */
export async function gravarLeitura(i: NovaLeitura): Promise<{ duplicate: boolean }> {
  // A leitura entra no turno aberto POR QUEM REGISTROU. Sem turno próprio, fica sem vínculo
  // (shift_instance_id = null) — decisão da T-18: o operador em campo não perde a medição.
  const turno = await prisma.shiftInstance.findFirst({
    where: { tenant_id: i.tenantId, opened_by: i.userId, status: 'OPEN' },
    select: { id: true },
    orderBy: { opened_at: 'desc' },
  })

  const aposGravar: Array<() => Promise<void>> = []
  try {
    await prisma.$transaction(async (tx) => {
      await tx.reading.create({
        data: {
          tenant_id: i.tenantId,
          collection_point_id: i.collectionPointId,
          parameter_id: i.parameterId,
          shift_instance_id: turno?.id ?? null,
          value: i.value,
          unit: i.unit,
          notes: i.notes,
          is_non_conformant: i.isNonConformant,
          origin: 'MANUAL',
          photo_filename: i.photoFilename,
          client_id: i.clientId,
          recorded_by: i.userId,
          recorded_at: i.recordedAt,
        },
      })

      // Fora da faixa: abre automaticamente uma ocorrência
      if (i.isNonConformant && i.parameterId) {
        const padrao = await tx.occurrenceSeverityDefault.findUnique({
          where: { tenant_id_severity: { tenant_id: i.tenantId, severity: 'HIGH' } },
        })
        const prazo = new Date()
        prazo.setHours(prazo.getHours() + (padrao?.deadline_hours || 24))

        const ocorrencia = await tx.occurrence.create({
          data: {
            tenant_id: i.tenantId,
            description: `Não Conformidade (${i.paramName}): Leitura registrada = ${i.value} ${i.unit ?? ''}. O valor está fora dos limites aceitáveis.`,
            severity: 'HIGH',
            status: 'OPEN',
            type: 'OPERATIONAL',
            deadline: prazo,
            reported_by: i.userId,
            collection_point_id: i.collectionPointId,
          },
        })
        const hook = await handleNewOccurrence(tx, ocorrencia)
        if (hook) aposGravar.push(hook)
      }
    })
  } catch (err) {
    // T-15: dois envios simultâneos do mesmo client_id — o índice único barra o segundo;
    // a leitura já existe, então para o aparelho isso é sucesso.
    if (i.clientId && violacaoDeUnicidade(err)) return { duplicate: true }
    throw err
  }

  for (const hook of aposGravar) {
    await hook().catch((err) => console.error('Error in postCommitHook:', err))
  }
  return { duplicate: false }
}
