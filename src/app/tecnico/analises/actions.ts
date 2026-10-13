'use server'

import { requirePermission } from '@/server/auth/guards'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { getTenantId } from '@/lib/tenant'
import { checkOwnership } from '@/lib/ownership'
import { localInputToUTC } from '@/lib/date-utils'
import { criarOcorrenciaAutomatica } from '@/server/occurrences/criar'
import { logAudit } from '@/lib/audit'




const AnaliseSchema = z.object({
  collection_point_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione o ponto de coleta'),
  parameter_id:        z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione o parâmetro'),
  value: numeroBR({ rotulo: 'O valor medido', obrigatorio: 'Informe o valor medido' }),
  report_text: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(5000, 'Laudo deve ter no máximo 5000 caracteres').nullable(),
  ),
  laboratory_type: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  collected_at: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, 'Informe a data/hora da coleta'),
})

export type AnaliseFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar análise ────────────────────────────────────────────────────────

export async function registrarAnalise(
  _prev: AnaliseFormState,
  formData: FormData,
): Promise<AnaliseFormState> {
  const ctx = await requirePermission('analysis.create')

  const parsed = AnaliseSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    report_text:         formData.get('report_text'),
    laboratory_type:     formData.get('laboratory_type'),
    collected_at:        formData.get('collected_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = ctx.userId

  const param = await prisma.qualityParameter.findFirst({ where: { id: parsed.data.parameter_id , tenant_id: (await getTenantId()) },
    select: { name: true, min_limit: true, max_limit: true, unit: true, default_method_id: true },
  })
  if (!param) return { error: 'Parâmetro não encontrado.' }

  const erroPosse = await checkOwnership(await getTenantId(), [
    { model: 'collectionPoint', id: parsed.data.collection_point_id },
  ])
  if (erroPosse) return { error: erroPosse }

  const isNonConformant =
    calcularNaoConformidade(parsed.data.value, param.min_limit, param.max_limit) ?? false

  const tenantId = await getTenantId()

  const postCommitHooks: Array<() => Promise<void>> = []
  await prisma.$transaction(async (tx) => {
    const analysis = await tx.analysis.create({
      data: {
        tenant_id:           tenantId,
        collection_point_id: parsed.data.collection_point_id,
        parameter_id:        parsed.data.parameter_id,
        method_id:           param.default_method_id,
        value:               parsed.data.value,
        unit:                param.unit,
        min_limit_applied:   param.min_limit,   // snapshot imutável
        max_limit_applied:   param.max_limit,   // snapshot imutável
        report_text:         parsed.data.report_text,
        laboratory_type:     parsed.data.laboratory_type,
        is_non_conformant:   isNonConformant,
        approved_by:         null,
        approved_at:         null,
        origin:              'MANUAL',
        collected_at:        localInputToUTC(parsed.data.collected_at),
        recorded_by:         userId,
      },
    })

    await logAudit(tx, {
      tenantId, userId, action: 'CREATE',
      tableName: 'analyses', recordId: analysis.id,
      after: { parameter_id: parsed.data.parameter_id, collection_point_id: parsed.data.collection_point_id, value: parsed.data.value, is_non_conformant: isNonConformant },
    })

    if (isNonConformant) {
      const point = await tx.collectionPoint.findFirst({
        where: { id: parsed.data.collection_point_id, tenant_id: tenantId },
        select: { name: true }
      })
      const paramName = await tx.qualityParameter.findFirst({
        where: { id: parsed.data.parameter_id, tenant_id: tenantId },
        select: { name: true }
      })

      // Caminho único (M-06): grava collection_point_id e usa o mesmo prazo/notificação.
      const hook = await criarOcorrenciaAutomatica(tx, {
        tenantId,
        userId,
        type:        'LABORATORY',
        severity:    'HIGH',
        description: `Não Conformidade (${paramName?.name}): Análise registrada = ${parsed.data.value} ${param.unit}. O valor está fora dos limites aceitáveis. Ponto de Coleta: ${point?.name || parsed.data.collection_point_id}`,
        collectionPointId: parsed.data.collection_point_id,
      })
      if (hook) postCommitHooks.push(hook)
    }
  })

  for (const hook of postCommitHooks) {
    await hook().catch(err => console.error('Error in postCommitHook:', err))
  }

  // ALTO-02: push duplicado para MANAGER removido (agora handleNewOccurrence cuida disso)
  // Mas mantemos para o operador se não for Não-Conforme (ou seja, isNonConformant === false)? 
  // Na verdade o bloco todo foi removido por redundância.

  revalidatePath('/tecnico/analises')
  return { success: true }
}

// ─── Aprovar análise ──────────────────────────────────────────────────────────
// Qualquer TECHNICIAN ou MANAGER pode aprovar qualquer análise pendente.

export async function aprovarAnalise(
  analysisId: string,
): Promise<{ error?: string }> {
  const ctx = await requirePermission('analysis.approve')
  const { userId, tenantId, role } = ctx

  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, tenant_id: tenantId },
    select: { approved_by: true, recorded_by: true },
  })
  if (!analysis)              return { error: 'Análise não encontrada.' }
  if (analysis.approved_by)   return { error: 'Análise já aprovada.' }

  // Separação de funções: quem registrou a análise não pode aprová-la.
  // Exceção: o gestor (MANAGER) pode aprovar qualquer análise, inclusive a que
  // registrou — cobre a planta com um único técnico.
  if (analysis.recorded_by === userId && role !== 'MANAGER') {
    return { error: 'Você não pode aprovar uma análise que registrou. Peça a outro responsável ou ao gestor.' }
  }

  // Condiciona a aprovação a `approved_by: null` para que duas aprovações numa
  // corrida não se sobreponham: só a primeira afeta a linha.
  const { count } = await prisma.analysis.updateMany({
    where: { id: analysisId, tenant_id: tenantId, approved_by: null },
    data:  { approved_by: userId, approved_at: new Date() },
  })
  if (count === 0) return { error: 'Análise já aprovada.' }

  await logAudit(prisma, {
    tenantId,
    userId,
    action:        'UPDATE',
    tableName:     'analyses',
    recordId:      analysisId,
    before:        { approved_by: null },
    after:         { approved_by: userId },
    justification: 'Aprovação de análise',
  })

  revalidatePath('/tecnico/analises')
  return {}
}
