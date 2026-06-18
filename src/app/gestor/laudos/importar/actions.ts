'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function extractDataFromPDF(base64Data: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  const prompt = `
Você é um especialista em análise ambiental e processamento de laudos de qualidade de água.
Analise o PDF em anexo, que é um laudo de laboratório terceirizado.
Extraia os resultados das análises de água.
Retorne um JSON ESTRITO seguindo este formato:
{
  "dataColeta": "YYYY-MM-DD", // data em que a amostra foi coletada (se não encontrar, retorne null)
  "pontoColeta": "Nome do Ponto", // ex: Saída Final, Reator, etc (se não encontrar, retorne null)
  "parametros": [
    {
      "nomeExtraido": "Nome do Parâmetro como está no laudo",
      "valor": 12.5, // apenas o número. Se for indetectável, ausente ou < limite, coloque 0. Extraia como float.
      "unidade": "mg/L" // unidade de medida
    }
  ]
}
Não retorne NENHUM texto além do JSON. Não adicione crases ou markdown. Apenas o objeto JSON válido.
`

  // Tentativa de fallback de modelos (algumas chaves não tem o 1.5 ativado)
  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-pro']
  let lastError: any = null

  for (const modelName of modelsToTry) {
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
      console.warn(`[GEMINI FALLBACK] Modelo ${modelName} falhou:`, err.message)
      lastError = err
    }
  }

  console.error('Erro em todos os modelos da IA:', lastError)
  return { success: false, error: lastError?.message || 'Falha ao processar o PDF com a Inteligência Artificial (Nenhum modelo compatível encontrado na chave API).' }
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

export async function saveMappedReadings(data: {
  pointId: string,
  date: string,
  readings: { parameterId: string, value: number, originalName: string }[]
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
  
  try {
    for (const r of data.readings) {
      const param = await prisma.qualityParameter.findFirst({
         where: { id: r.parameterId, tenant_id: tenantId }
      })
      if (!param) continue;

      const isNonConformant = calcularNaoConformidade(r.value, param.min_limit, param.max_limit)

      await prisma.$transaction(async (tx) => {
        await tx.reading.create({
          data: {
            tenant_id: tenantId,
            value: r.value,
            unit: param.unit,
            parameter_id: r.parameterId,
            collection_point_id: data.pointId,
            recorded_by: user.id,
            recorded_at: new Date(data.date),
            is_non_conformant: isNonConformant,
            origin: 'AI_IMPORT'
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
              description: `Não Conformidade via IA (${param.name}): Leitura registrada = ${r.value} ${param.unit}. O valor está fora dos limites aceitáveis. Ponto de Coleta: ${data.pointId}`,
              severity: 'HIGH',
              status: 'OPEN',
              deadline,
              reported_by: user.id,
            }
          })
        }

        // Criar ou ignorar o alias para aprendizado futuro
        if (r.originalName && r.originalName.trim() !== '') {
          // Usamos upsert para evitar erro de constraint única se rodar em paralelo
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
