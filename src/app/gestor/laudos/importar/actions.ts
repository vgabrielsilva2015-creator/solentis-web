'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function extractDataFromPDF(base64Data: string, mimeType: string) {
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
  let lastError: any = null

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType } }
        ])

        const text = result.response.text()
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
        
        return { success: true, data: JSON.parse(cleaned), usedModel: modelName }
      } catch (err: any) {
        lastError = err
        const errorMsg = (err.message || '').toLowerCase()
        console.warn(`[GEMINI] Modelo ${modelName}, tentativa ${attempt + 1}/${MAX_RETRIES} falhou: ${err.message}`)

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
          console.log(`[GEMINI] Rate limit detectado. Aguardando ${waitTime}ms antes de retry...`)
          await delay(waitTime)
        } else if (!isRetryable) {
          // Se não for retryable (ex: modelo não existe), pular direto para o próximo modelo
          break
        }
      }
    }
  }

  // Sempre incluir o erro real para facilitar debug
  const rawError = lastError?.message || 'Erro desconhecido'
  const friendlyError = `Falha ao processar PDF. Erro: ${rawError.substring(0, 150)}`

  console.error('Erro em todos os modelos da IA:', lastError)
  return { success: false, error: friendlyError }
}

export async function getMappingContext() {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const tenantId = await getTenantId()
  
  const parameters = await prisma.qualityParameter.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: { id: true, name: true, unit: true },
    orderBy: { name: 'asc' }
  })
  
  const points = await prisma.collectionPoint.findMany({
    where: { tenant_id: tenantId, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })
  
  const aliases = await prisma.parameterAlias.findMany({
    where: { tenant_id: tenantId },
    select: { alias: true, parameter_id: true }
  })
  
  return { parameters, points, aliases }
}

export async function createParameterFromImport(data: { name: string; unit: string }) {
  const { prisma } = await import('@/lib/prisma')
  const { getTenantId } = await import('@/lib/tenant')
  const { auth } = await import('@/lib/auth')
  
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado.' }
  
  const tenantId = await getTenantId()
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    select: { id: true }
  })
  if (!user) return { success: false, error: 'Usuário não encontrado.' }

  try {
    const param = await prisma.qualityParameter.create({
      data: {
        tenant_id: tenantId,
        name: data.name.trim(),
        unit: data.unit.trim() || 'mg/L',
        effective_date: new Date(),
        is_active: true,
        created_by: user.id,
      }
    })

    // Criar alias automático com o nome original do laudo
    await prisma.parameterAlias.create({
      data: {
        tenant_id: tenantId,
        alias: data.name.trim(),
        parameter_id: param.id,
      }
    })

    return { success: true, parameter: { id: param.id, name: param.name, unit: param.unit } }
  } catch (err: any) {
    console.error('Erro ao criar parâmetro:', err)
    return { success: false, error: err.message }
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
  
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado.' }
  
  const tenantId = await getTenantId()

  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email: session.user.email! } },
    select: { id: true }
  })
  if (!user) return { success: false, error: 'Usuário não encontrado.' }

  // Buscar a matriz do ponto para verificação multi-matriz
  const point = await prisma.collectionPoint.findUnique({
    where: { id: data.pointId }
  })
  const matrixName = point?.matrix || null

  // Usar fallback de metodo
  const fallbackMethod = await prisma.analysisMethod.findFirst({
    where: { tenant_id: tenantId }
  })
  
  try {
    for (const r of data.readings) {
      const param = await prisma.qualityParameter.findFirst({
         where: { id: r.parameterId, tenant_id: tenantId }
      })
      if (!param) continue;

      let min_limit: number | null = null
      let max_limit: number | null = null

      if (matrixName) {
        const pLimit = await prisma.parameterLimit.findFirst({
          where: { parameter_id: param.id, matrix: matrixName }
        })
        if (pLimit) {
          min_limit = pLimit.min_limit
          max_limit = pLimit.max_limit
        }
      }

      const isNonConformant = calcularNaoConformidade(r.value, min_limit, max_limit, r.is_detected)

      await prisma.$transaction(async (tx) => {
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
        
        if (isNonConformant) {
          const defaultSeverity = await tx.occurrenceSeverityDefault.findUnique({
            where: { severity: 'HIGH' }
          })
          const deadlineHours = defaultSeverity?.deadline_hours || 24
          const deadline = new Date()
          deadline.setHours(deadline.getHours() + deadlineHours)

          await tx.occurrence.create({
            data: {
              tenant_id: tenantId,
              description: `Não Conformidade via Laudo (${param.name}): Resultado = ${r.bruto}. O valor está fora dos limites aceitáveis para a matriz ${matrixName || 'não definida'}. Ponto: ${point?.name}`,
              severity: 'HIGH',
              status: 'OPEN',
              deadline,
              reported_by: user.id,
            }
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
      })
    }
    
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { success: false, error: err.message }
  }
}
