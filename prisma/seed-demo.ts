/**
 * Seed de demonstração: gera ~6 meses de dados operacionais realistas.
 * Uso: npx tsx prisma/seed-demo.ts
 * Pré-requisito: npx prisma db seed (seed principal) já executado.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT_ID = 'default'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Carregando dados base...')

  const [users, params, methods, points, shifts, equipment, products] = await Promise.all([
    prisma.user.findMany({ where: { tenant_id: TENANT_ID } }),
    prisma.qualityParameter.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.analysisMethod.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.collectionPoint.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.shift.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.equipment.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.chemicalProduct.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
  ])

  const operators   = users.filter((u) => u.role === 'OPERATOR')
  const technicians = users.filter((u) => u.role === 'TECHNICIAN')
  const managers    = users.filter((u) => u.role === 'MANAGER')
  const allUsers    = users

  if (operators.length === 0 || technicians.length === 0) {
    console.error('Rode npx prisma db seed antes deste script.')
    process.exit(1)
  }

  // ── Leituras (180 dias × ~2/dia) ─────────────────────────────────────────
  console.log('Gerando leituras de campo...')
  const readingsData: Prisma.ReadingCreateManyInput[] = []
  for (let day = 180; day >= 0; day--) {
    const count = randomInt(1, 4)
    for (let i = 0; i < count; i++) {
      const param = randomItem(params)
      const point = randomItem(points)
      const op    = randomItem(operators)
      const base  = param.max_limit ?? 10
      // ~20% dos valores fora do limite para gerar não-conformidades
      const outOfRange = Math.random() < 0.2
      const value = outOfRange
        ? base * randomBetween(1.1, 1.5)
        : base * randomBetween(0.3, 0.95)

      const isNonConformant =
        (param.max_limit !== null && value > param.max_limit) ||
        (param.min_limit !== null && value < param.min_limit)

      readingsData.push({
        tenant_id:           TENANT_ID,
        collection_point_id: point.id,
        parameter_id:        param.id,
        value,
        unit:                param.unit,
        is_non_conformant:   isNonConformant,
        origin:              'MANUAL',
        recorded_by:         op.id,
        recorded_at:         daysAgo(day),
        created_at:          daysAgo(day),
      })
    }
  }
  await prisma.reading.createMany({ data: readingsData })
  console.log(`  ${readingsData.length} leituras criadas`)

  // ── Análises (180 dias × ~1/dia) ─────────────────────────────────────────
  console.log('Gerando análises laboratoriais...')
  const analysesData: Prisma.AnalysisCreateManyInput[] = []
  for (let day = 180; day >= 0; day--) {
    if (Math.random() < 0.4) continue // ~60% dos dias têm análise
    const param  = randomItem(params)
    const method = randomItem(methods)
    const point  = randomItem(points)
    const tech   = randomItem(technicians)
    const base   = param.max_limit ?? 10
    const outOfRange = Math.random() < 0.25
    const value  = outOfRange
      ? base * randomBetween(1.1, 1.6)
      : base * randomBetween(0.2, 0.95)

    const isNonConformant =
      (param.max_limit !== null && value > param.max_limit) ||
      (param.min_limit !== null && value < param.min_limit)

    // ~70% das análises são aprovadas
    const approved = Math.random() < 0.7
    const approver = approved ? randomItem([...technicians, ...managers]) : null

    analysesData.push({
      tenant_id:           TENANT_ID,
      collection_point_id: point.id,
      parameter_id:        param.id,
      method_id:           method.id,
      value,
      unit:                param.unit,
      min_limit_applied:   param.min_limit,
      max_limit_applied:   param.max_limit,
      is_non_conformant:   isNonConformant,
      approved_by:         approver?.id ?? null,
      approved_at:         approver ? daysAgo(day) : null,
      origin:              'MANUAL',
      collected_at:        daysAgo(day),
      recorded_by:         tech.id,
      created_at:          daysAgo(day),
    })
  }
  await prisma.analysis.createMany({ data: analysesData })
  console.log(`  ${analysesData.length} análises criadas`)

  // ── Ocorrências (1 por semana nos últimos 6 meses) ────────────────────────
  console.log('Gerando ocorrências...')
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
  const statuses   = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const

  const severityDefaults = await prisma.occurrenceSeverityDefault.findMany()
  const deadlineMap = new Map(severityDefaults.map((s) => [s.severity, s.deadline_hours]))

  const occurrencesData: Prisma.OccurrenceCreateManyInput[] = []
  for (let week = 24; week >= 0; week--) {
    const count = randomInt(1, 3)
    for (let i = 0; i < count; i++) {
      const sev        = randomItem(severities)
      const op         = randomItem(operators)
      const deadlineH  = deadlineMap.get(sev) ?? 72
      const createdAt  = daysAgo(week * 7 + randomInt(0, 6))
      const deadline   = new Date(createdAt.getTime() + deadlineH * 60 * 60 * 1000)
      const isResolved = Math.random() < 0.6
      const status     = isResolved ? 'RESOLVED' : randomItem(['OPEN', 'IN_PROGRESS'])

      occurrencesData.push({
        tenant_id:        TENANT_ID,
        description:      `Ocorrência de demonstração — ${sev} — semana ${week}`,
        severity:         sev,
        status,
        deadline,
        resolved_at:      isResolved ? new Date(deadline.getTime() + randomInt(-12, 48) * 60 * 60 * 1000) : null,
        resolved_by:      isResolved ? randomItem([...technicians, ...managers]).id : null,
        resolution_notes: isResolved ? 'Problema identificado e corrigido conforme procedimento.' : null,
        reported_by:      op.id,
        created_at:       createdAt,
        updated_at:       createdAt,
      })
    }
  }
  await prisma.occurrence.createMany({ data: occurrencesData })
  console.log(`  ${occurrencesData.length} ocorrências criadas`)

  // ── Manutenções preventivas concluídas ───────────────────────────────────
  console.log('Gerando preventivas concluídas...')
  if (equipment.length > 0) {
    const preventivas = []
    for (const eq of equipment) {
      // Simula 3-6 preventivas concluídas nos últimos 6 meses
      const count = randomInt(2, 5)
      for (let i = count; i >= 1; i--) {
        const scheduledDaysAgo = i * Math.floor(180 / count)
        const tech = randomItem(technicians)
        preventivas.push({
          tenant_id:      TENANT_ID,
          equipment_id:   eq.id,
          scheduled_date: daysAgo(scheduledDaysAgo + 2),
          completed_date: daysAgo(scheduledDaysAgo),
          completed_by:   tech.id,
          status:         'COMPLETED',
          notes:          'Preventiva realizada conforme plano de manutenção.',
          created_at:     daysAgo(scheduledDaysAgo + 5),
          updated_at:     daysAgo(scheduledDaysAgo),
        })
      }
    }
    await prisma.preventiveMaintenance.createMany({ data: preventivas })
    console.log(`  ${preventivas.length} preventivas concluídas criadas`)
  }

  // ── Movimentação de estoque ───────────────────────────────────────────────
  console.log('Gerando movimentação de estoque...')
  if (products.length > 0) {
    const entries = []
    const exits   = []

    for (const product of products) {
      const manager = randomItem(managers)
      const op      = randomItem(operators)

      // 3-6 entradas (compras) ao longo dos 6 meses
      const entryCount = randomInt(3, 6)
      for (let i = 0; i < entryCount; i++) {
        entries.push({
          tenant_id:     TENANT_ID,
          product_id:    product.id,
          quantity:      randomBetween(20, 100),
          supplier:      'Fornecedor Demo Ltda.',
          invoice_number: `NF-${10000 + randomInt(0, 9999)}`,
          received_at:   daysAgo(randomInt(5, 175)),
          recorded_by:   manager.id,
          created_at:    daysAgo(randomInt(5, 175)),
        })
      }

      // ~1 saída por semana
      for (let week = 24; week >= 1; week--) {
        if (Math.random() < 0.6) {
          exits.push({
            tenant_id:   TENANT_ID,
            product_id:  product.id,
            quantity:    randomBetween(0.5, 8),
            notes:       'Uso operacional semanal.',
            used_at:     daysAgo(week * 7 + randomInt(0, 4)),
            recorded_by: op.id,
            created_at:  daysAgo(week * 7 + randomInt(0, 4)),
          })
        }
      }
    }

    await prisma.chemicalStockEntry.createMany({ data: entries })
    await prisma.chemicalStockExit.createMany({ data: exits })
    console.log(`  ${entries.length} entradas + ${exits.length} saídas de estoque criadas`)
  }

  const totalRecords =
    readingsData.length + analysesData.length + occurrencesData.length

  console.log(`\nSeed-demo concluído. ~${totalRecords} registros operacionais criados.`)
  console.log('Execute "npm run dev" e acesse /gestor/dashboard para ver os dados.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
