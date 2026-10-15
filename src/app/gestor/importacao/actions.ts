'use server'

import { getActor, permissionError, requirePermission } from '@/server/auth/guards'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getLogger } from '@/lib/logger'
import { MAX_LAUDO_BASE64_CHARS, MAX_LAUDO_BYTES, mb } from '@/lib/upload-limits'
import { logAudit } from '@/lib/audit'
import { criarOcorrenciaAutomatica } from '@/server/occurrences/criar'
import { sniffLaudoType } from '@/lib/laudo-sniff'
import {
  buckets, countRecent, recordEvents, laudoAllowed,
  LAUDO_WINDOW_MS, LAUDO_USER_LIMIT,
} from '@/lib/rate-limit'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Timeout duro para uma chamada ao Gemini — não deixa a função serverless pendurada. */
const GEMINI_TIMEOUT_MS = 45_000
function comTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout da IA')), ms)),
  ])
}

export async function extractDataFromPDF(base64Data: string, mimeType: string) {
  // Server Actions são endpoints públicos: estar sob /gestor não protege.
  // Sem este guard, qualquer sessão poderia queimar a cota paga do Gemini.
  const ctx = await requirePermission('lab.import')
  const log = await getLogger({ action: 'extractDataFromPDF', tenantId: ctx.tenantId, userId: ctx.userId })

  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
    throw new Error('Tipo de arquivo inválido.')
  }
  // base64 = 4/3 dos bytes reais; a requisição inteira não pode passar de 4,5 MB na Vercel (T-24).
  if (typeof base64Data !== 'string' || base64Data.length > MAX_LAUDO_BASE64_CHARS) {
    throw new Error(`Arquivo muito grande. O limite por arquivo é ${mb(MAX_LAUDO_BYTES)}; reduza o PDF e tente de novo.`)
  }

  // Magic bytes (M-16): o mimeType vem do cliente e é forjável. Confere o conteúdo real
  // (só o cabeçalho) antes de gastar a cota do Gemini; rejeita se não bater com o tipo.
  const header = Buffer.from(base64Data.slice(0, 64), 'base64')
  const realType = sniffLaudoType(header)
  if (realType !== mimeType) {
    log.warn({ mimeType, realType }, 'Laudo recusado: conteúdo não bate com o tipo informado')
    throw new Error('O arquivo não é um PDF, JPEG ou PNG válido. Envie o laudo original.')
  }

  // Rate limit (M-16): protege a cota paga. Conta a janela do usuário e do tenant; se
  // estourar, barra antes de chamar a IA. Fail-open: um soluço do banco não bloqueia.
  try {
    const [usoUser, usoTenant] = await Promise.all([
      countRecent(buckets.laudoUser(ctx.userId), LAUDO_WINDOW_MS),
      countRecent(buckets.laudoTenant(ctx.tenantId), LAUDO_WINDOW_MS),
    ])
    if (!laudoAllowed({ user: usoUser, tenant: usoTenant })) {
      log.warn({ usoUser, usoTenant }, 'Rate limit da importação de laudo atingido')
      return { success: false, error: `Limite de importações por hora atingido (${LAUDO_USER_LIMIT} por usuário). Tente mais tarde.` }
    }
    await recordEvents([buckets.laudoUser(ctx.userId), buckets.laudoTenant(ctx.tenantId)])
  } catch (err) {
    log.warn({ err }, 'Rate limit do laudo indisponível — seguindo (fail-open)')
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  const prompt = `
Você é um extrator de dados de laudos laboratoriais ambientais brasileiros (relatórios de ensaio). 
Leia o PDF e devolva SOMENTE um JSON válido no schema fornecido, sem comentários e sem texto fora do JSON. 
Não invente valores: se um campo não existir no laudo, use null.
Preserve os números exatamente como aparecem na hora de extrair "bruto", mas converta para float com ponto em "valor".
Resultados abaixo do limite de quantificação (ex.: "<0,05") devem ser marcados como "detectado": false, "valor": null, e "bruto" com o texto original.

Retorne um JSON ESTRITO seguindo este formato:
{
  "laboratorio": "Nome do Laboratório",
  "laudo_numero": "Numero do laudo",
  "ponto_amostragem": "Nome do Ponto",
  "matriz": "Matriz (ex: Água Subterrânea)",
  "data_coleta": "YYYY-MM-DD",
  "data_analise": "YYYY-MM-DD",
  "temperatura_amostra_c": 19.9,
  "ph_campo": 6.8,
  "resultados": [
    { 
      "parametro": "Nome do parametro", 
      "bruto": "<0,05", 
      "valor": null, 
      "unidade": "mg/L", 
      "detectado": false 
    }
  ]
}
Não retorne NENHUM texto além do JSON. Não adicione crases ou markdown. Apenas o objeto JSON válido.
`

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-pro']
  const MAX_RETRIES = 3
  const BASE_DELAY_MS = 3000
  let lastError: unknown = null

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await comTimeout(model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ]), GEMINI_TIMEOUT_MS)

        const text = result.response.text()
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()

        // Uso/custo (M-16): registra a chamada que de fato consumiu cota paga.
        log.info({ model: modelName, bytes: Math.round((base64Data.length * 3) / 4) }, 'Importação de laudo processada pela IA')
        return { success: true, data: JSON.parse(cleaned), usedModel: modelName }
      } catch (err: unknown) {
        lastError = err
        const errorMsg = (err instanceof Error ? err.message : '').toLowerCase()
        log.warn({ err, model: modelName, attempt: attempt + 1, maxRetries: MAX_RETRIES }, 'Tentativa da IA (Gemini) falhou')

        // Detectar erros retryable de forma mais abrangente
        const isRetryable = errorMsg.includes('429') 
          || errorMsg.includes('503') 
          || errorMsg.includes('resource_exhausted') 
          || errorMsg.includes('overloaded')
          || errorMsg.includes('quota')
          || errorMsg.includes('too many')
          || errorMsg.includes('rate')
        
        if (isRetryable && attempt < MAX_RETRIES - 1) {
          const waitTime = BASE_DELAY_MS * Math.pow(2, attempt) // 3s, 6s, 12s
          log.info({ model: modelName, waitTime }, 'Rate limit da IA detectado — aguardando antes do retry')
          await delay(waitTime)
        } else if (!isRetryable) {
          // Se não for retryable (ex: modelo não existe), pular direto para o próximo modelo
          break
        }
      }
    }
  }

  // Sempre incluir o erro real para facilitar debug
  // E6: o erro cru da IA (dependência externa) fica só no log; ao cliente vai mensagem
  // genérica e acionável (não vaza detalhe de stack/terceiro na tela).
  log.error({ err: lastError }, 'Erro em todos os modelos da IA')
  return {
    success: false,
    error: 'Não foi possível processar o laudo agora. Tente novamente em alguns instantes; se persistir, confira se o arquivo é um PDF/imagem legível ou avise o suporte.',
  }
}

export async function getMappingContext() {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')

  await requirePermission('lab.import')

  const tenantId = await getTenantId()

  // M-15: três leituras independentes do mesmo tenant — em paralelo (uma ida só ao
  // pooler em vez de três idas em série), reduzindo o tempo de ocupação da conexão.
  const [parameters, points, aliases] = await Promise.all([
    prisma.qualityParameter.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, name: true, unit: true },
      orderBy: { name: 'asc' },
    }),
    prisma.collectionPoint.findMany({
      where: { tenant_id: tenantId, is_active: true, is_external: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.parameterAlias.findMany({
      where: { tenant_id: tenantId },
      select: { alias: true, parameter_id: true },
    }),
  ])

  return { parameters, points, aliases }
}

export async function createParameterFromImport(data: { name: string; unit: string }) {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')
  
  const ctx = await getActor()
  if (permissionError(ctx, 'lab.import')) return { success: false, error: 'Não autorizado.' }
  
  const tenantId = await getTenantId()
  const user = { id: ctx.userId }

  const nome = data.name?.trim()
  const unidade = data.unit?.trim() || 'mg/L'
  if (!nome) return { success: false, error: 'Informe o nome do parâmetro.' }

  try {
    // Atômico: parâmetro + alias + auditoria numa transação. Se o alias colide
    // (unique por tenant), tudo faz rollback — nada de parâmetro órfão sem alias.
    const param = await prisma.$transaction(async (tx) => {
      const p = await tx.qualityParameter.create({
        data: {
          tenant_id: tenantId,
          name: nome,
          unit: unidade,
          effective_date: new Date(),
          is_active: true,
          created_by: user.id,
        },
      })
      await tx.parameterAlias.create({
        data: { tenant_id: tenantId, alias: nome, parameter_id: p.id },
      })
      await logAudit(tx, {
        tenantId, userId: user.id, action: 'CREATE',
        tableName: 'quality_parameters', recordId: p.id,
        after: { name: p.name, unit: p.unit, origem: 'IMPORTACAO_LAUDO' },
      })
      return p
    })

    return { success: true, parameter: { id: param.id, name: param.name, unit: param.unit } }
  } catch (err: unknown) {
    const log = await getLogger({ action: 'criarParametroDoLaudo' })
    log.error({ err }, 'Erro ao criar parâmetro')
    return { success: false, error: 'Não foi possível criar o parâmetro. Tente novamente.' }
  }
}

export async function saveMappedReadings(data: {
  pointId: string,
  date: string,
  readings: { parameterId: string, value: number | null, is_detected: boolean, originalName: string, bruto: string, unit: string }[]
}) {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')
  const { calcularNaoConformidade } = await import('@/lib/readings-utils')
  
  const ctx = await getActor()
  if (permissionError(ctx, 'lab.import')) return { success: false, error: 'Não autorizado.' }

  const tenantId = await getTenantId()

  const user = { id: ctx.userId }
  const log = await getLogger({ action: 'salvarLeiturasLaudo', tenantId })

  // Buscar a matriz do ponto para verificação multi-matriz.
  // Rejeita ponto inexistente/de outro tenant — a FK é global, então sem este
  // check um ponto de outro tenant poderia ser associado à análise.
  const point = await prisma.collectionPoint.findFirst({
    where: { id: data.pointId, tenant_id: tenantId }
  })
  if (!point) return { success: false, error: 'Ponto de coleta inválido.' }
  const matrixName = point.matrix || null

  // Usar fallback de metodo
  const fallbackMethod = await prisma.analysisMethod.findFirst({
    where: { tenant_id: tenantId }
  })

  // Batch: busca todos os parâmetros (e limites, se houver matriz) de uma vez,
  // em vez de 1-2 queries por leitura dentro do loop. Mesmo resultado.
  const uniqueParamIds = [...new Set(data.readings.map((r) => r.parameterId))]

  const params = await prisma.qualityParameter.findMany({
    where: { id: { in: uniqueParamIds }, tenant_id: tenantId },
  })
  const paramMap = new Map(params.map((p) => [p.id, p]))

  const limitMap = new Map<string, { min_limit: number | null; max_limit: number | null }>()
  if (matrixName) {
    const limits = await prisma.parameterLimit.findMany({
      where: { parameter_id: { in: uniqueParamIds }, matrix: matrixName, tenant_id: tenantId },
    })
    for (const l of limits) limitMap.set(l.parameter_id, { min_limit: l.min_limit, max_limit: l.max_limit })
  }

  let criadas = 0
  let naoConformes = 0

  try {
    for (const r of data.readings) {
      const param = paramMap.get(r.parameterId)
      if (!param) continue;

      let min_limit: number | null = null
      let max_limit: number | null = null

      if (matrixName) {
        const pLimit = limitMap.get(param.id)
        if (pLimit) {
          min_limit = pLimit.min_limit
          max_limit = pLimit.max_limit
        }
      }

      const isNonConformant = calcularNaoConformidade(r.value, min_limit, max_limit, r.is_detected)

      // A transação devolve o hook de notificação (ou null) para rodarmos pós-commit.
      const hook = await prisma.$transaction(async (tx) => {
        await tx.analysis.create({
          data: {
            tenant_id: tenantId,
            value: r.value,
            raw_value: r.bruto || String(r.value),
            unit: r.unit || param.unit,
            parameter_id: r.parameterId,
            collection_point_id: data.pointId,
            recorded_by: user.id,
            collected_at: new Date(data.date),
            is_non_conformant: isNonConformant ?? false,
            is_detected: r.is_detected,
            laboratory_type: 'EXTERNAL',
            origin: 'AI_IMPORT',
            method_id: fallbackMethod?.id || null,
            min_limit_applied: min_limit,
            max_limit_applied: max_limit
          }
        })

        // Caminho único (M-06): grava type + collection_point_id e dispara a notificação
        // ao gestor, como leitura/análise. O ponto já foi validado contra o tenant acima.
        let notifHook: (() => Promise<void>) | null = null
        if (isNonConformant) {
          notifHook = await criarOcorrenciaAutomatica(tx, {
            tenantId,
            userId: user.id,
            type: 'LABORATORY',
            severity: 'HIGH',
            description: `Não Conformidade via Laudo (${param.name}): Resultado = ${r.bruto}. O valor está fora dos limites aceitáveis para a matriz ${matrixName || 'não definida'}. Ponto: ${point?.name}`,
            collectionPointId: data.pointId,
            parameterId: r.parameterId,
          })
        }

        if (r.originalName && r.originalName.trim() !== '') {
          const aliasName = r.originalName.trim()
          await tx.parameterAlias.upsert({
            where: { tenant_id_alias: { tenant_id: tenantId, alias: aliasName } },
            update: { parameter_id: r.parameterId },
            create: {
              tenant_id: tenantId,
              alias: aliasName,
              parameter_id: r.parameterId
            }
          })
        }
        return notifHook
      })
      // Pós-commit: notifica os gestores. Falha de envio não derruba o que já foi gravado.
      if (hook) await hook().catch((err) => log.error({ err }, 'Falha ao notificar NC de laudo'))
      criadas++
      if (isNonConformant) naoConformes++
    }

    // Auditoria: um registro-resumo da importação do laudo (as análises individuais
    // já carregam recorded_by/origin=AI_IMPORT). Evita N linhas de auditoria por import.
    if (criadas > 0) {
      await logAudit(prisma, {
        tenantId, userId: user.id, action: 'CREATE',
        tableName: 'analyses', recordId: data.pointId,
        after: { origem: 'AI_IMPORT', ponto: data.pointId, data: data.date, analises: criadas, nao_conformes: naoConformes },
      })
    }

    return { success: true }
  } catch (err: unknown) {
    log.error({ err }, 'Falha na transação de salvamento do laudo')
    return { success: false, error: 'Não foi possível salvar as leituras. Verifique os dados e tente novamente.' }
  }
}
