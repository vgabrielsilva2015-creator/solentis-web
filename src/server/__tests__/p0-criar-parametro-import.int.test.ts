/**
 * P0 — createParameterFromImport é atômico (sem escrita parcial).
 * Se o alias colide (unique por tenant), o parâmetro NÃO pode ficar órfão.
 * Banco real (T-28).
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs } from '@/test/auth-mock'
import { criarCenario } from '@/test/factories'
import { createParameterFromImport } from '@/app/gestor/importacao/actions'

describe('createParameterFromImport — atomicidade', () => {
  it('alias já existente: falha controlada e NÃO cria parâmetro órfão (rollback)', async () => {
    const A = await criarCenario('A')
    const p1 = await prisma.qualityParameter.create({
      data: { tenant_id: A.tenant.id, name: 'Cloro Residual', unit: 'mg/L', effective_date: new Date(), created_by: A.gestor.id },
    })
    await prisma.parameterAlias.create({ data: { tenant_id: A.tenant.id, alias: 'Cloro', parameter_id: p1.id } })

    actAs(A.gestor)
    const r = await createParameterFromImport({ name: 'Cloro', unit: 'mg/L' }) // alias 'Cloro' colide

    expect(r.success).toBe(false)
    expect(await prisma.qualityParameter.count({ where: { tenant_id: A.tenant.id, name: 'Cloro' } })).toBe(0)
    const alias = await prisma.parameterAlias.findFirstOrThrow({ where: { tenant_id: A.tenant.id, alias: 'Cloro' } })
    expect(alias.parameter_id).toBe(p1.id) // segue apontando para o original
  })

  it('nome vazio é rejeitado sem criar nada', async () => {
    const A = await criarCenario('A')
    actAs(A.gestor)
    const r = await createParameterFromImport({ name: '   ', unit: 'mg/L' })
    expect(r.success).toBe(false)
    expect(await prisma.qualityParameter.count({ where: { tenant_id: A.tenant.id } })).toBe(0)
  })
})
