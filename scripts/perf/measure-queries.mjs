/**
 * M-12 — orçamento de queries por página (medir antes de otimizar).
 *
 * Script DEV-ONLY e autossuficiente: NÃO é importado pelo app, não vai para o build.
 * Cria um PrismaClient próprio com log de query, conta quantas queries e quanto tempo a
 * CAMADA DE DADOS de cada página gasta (replicando as queries dominantes de cada página),
 * e grava docs/auditoria/PERF-BASELINE.md.
 *
 * Uso:
 *   DATABASE_URL="postgres://.../solentis_perf" node scripts/perf/measure-queries.mjs
 * contra um banco com dados sintéticos (prisma/seed.ts + prisma/seed-demo.ts).
 *
 * Nota honesta: mede o PRIMARY data fetch replicado de cada página (não o render RSC real);
 * para números de escala real, rodar scripts/load/ (k6) num staging com 12+ meses de dados.
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] })
let count = 0
prisma.$on('query', () => { count++ })

async function medir(nome, fn) {
  count = 0
  const t0 = performance.now()
  await fn()
  const ms = Math.round((performance.now() - t0) * 10) / 10
  return { nome, queries: count, ms }
}

const t = await prisma.tenant.findFirst({ select: { id: true } })
if (!t) { console.error('Sem tenant — rode prisma/seed.ts + seed-demo.ts no banco de perf.'); process.exit(1) }
const tid = t.id
const agora = new Date()
const dias = (n) => new Date(agora.getTime() - n * 864e5)
const d7 = dias(7), d30 = dias(30), d90 = dias(90)
const hojeIni = new Date(agora); hojeIni.setHours(0, 0, 0, 0)

const vol = {
  readings: await prisma.reading.count({ where: { tenant_id: tid } }),
  analyses: await prisma.analysis.count({ where: { tenant_id: tid } }),
  occurrences: await prisma.occurrence.count({ where: { tenant_id: tid } }),
  equipment: await prisma.equipment.count({ where: { tenant_id: tid } }),
}

const r = []

// ── GESTOR ────────────────────────────────────────────────────────────────────
r.push(await medir('gestor/dashboard', async () => {
  await prisma.occurrence.groupBy({ by: ['severity'], where: { tenant_id: tid, status: { not: 'RESOLVED' } }, _count: { id: true } })
  await prisma.reading.groupBy({ by: ['parameter_id'], where: { tenant_id: tid, recorded_at: { gte: d30 } }, _count: { id: true }, orderBy: { _count: { parameter_id: 'desc' } }, take: 1 })
  await prisma.reading.count({ where: { tenant_id: tid, recorded_at: { gte: d7 } } })
  await prisma.analysis.count({ where: { tenant_id: tid, created_at: { gte: d30 } } })
  await prisma.analysis.groupBy({ by: ['parameter_id'], where: { tenant_id: tid, is_non_conformant: true, collected_at: { gte: d90 } }, _count: { id: true } })
  await prisma.occurrence.findMany({ where: { tenant_id: tid, status: { not: 'RESOLVED' } }, orderBy: { created_at: 'desc' }, take: 20, include: { collection_point: { select: { name: true } } } })
  await prisma.chemicalStockExit.aggregate({ where: { tenant_id: tid, used_at: { gte: d30 } }, _sum: { quantity: true } })
}))
r.push(await medir('gestor/leituras', async () => {
  const where = { tenant_id: tid }
  await prisma.reading.findMany({ where, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } }, recorder: { select: { name: true } } }, orderBy: { recorded_at: 'desc' }, take: 20 })
  await prisma.reading.count({ where })
}))
r.push(await medir('gestor/ocorrencias', async () => {
  const where = { tenant_id: tid }
  await prisma.occurrence.findMany({ where, include: { collection_point: { select: { name: true } }, reporter: { select: { name: true } }, parameter: { select: { name: true } } }, orderBy: { created_at: 'desc' }, take: 20 })
  await prisma.occurrence.count({ where })
}))
r.push(await medir('gestor/auditoria', async () => {
  const where = { tenant_id: tid }
  await prisma.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { timestamp: 'desc' }, take: 25 })
  await prisma.auditLog.count({ where })
}))
r.push(await medir('gestor/produtos-quimicos', async () => {
  await prisma.chemicalProduct.findMany({ where: { tenant_id: tid }, include: { entries: { select: { quantity: true } }, exits: { select: { quantity: true } }, counts: { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 } }, orderBy: { name: 'asc' } })
}))

// ── OPERADOR ────────────────────────────────────────────────────────────────────
r.push(await medir('operador/dashboard', async () => {
  await prisma.shiftInstance.findFirst({ where: { tenant_id: tid, status: 'OPEN' }, orderBy: { opened_at: 'desc' } })
  await prisma.reading.count({ where: { tenant_id: tid, recorded_at: { gte: hojeIni } } })
  await prisma.occurrence.count({ where: { tenant_id: tid, status: { not: 'RESOLVED' } } })
  await prisma.shiftTask.count({ where: { tenant_id: tid, status: 'PENDING' } })
  await prisma.shiftHandover.count({ where: { tenant_id: tid, status: { in: ['PENDING', 'TIMED_OUT'] } } })
  await prisma.shift.findMany({ where: { tenant_id: tid, is_active: true } })
}))
r.push(await medir('operador/leituras', async () => {
  await prisma.reading.findMany({ where: { tenant_id: tid }, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } } }, orderBy: { recorded_at: 'desc' }, take: 20 })
}))

// ── TÉCNICO ────────────────────────────────────────────────────────────────────
r.push(await medir('tecnico/dashboard', async () => {
  await prisma.preventiveMaintenance.count({ where: { tenant_id: tid, status: 'SCHEDULED', scheduled_date: { lt: agora } } })
  await prisma.analysis.count({ where: { tenant_id: tid, approved_by: null } })
  await prisma.analysis.count({ where: { tenant_id: tid, is_non_conformant: true } })
  await prisma.correctiveMaintenance.count({ where: { tenant_id: tid, status: { in: ['OPEN', 'IN_PROGRESS'] } } })
  await prisma.analysis.findMany({ where: { tenant_id: tid }, orderBy: { collected_at: 'desc' }, take: 10 })
}))
r.push(await medir('tecnico/analises', async () => {
  const where = { tenant_id: tid }
  await prisma.analysis.findMany({ where, include: { collection_point: { select: { name: true } }, parameter: { select: { name: true } }, recorder: { select: { name: true } } }, orderBy: { collected_at: 'desc' }, take: 20 })
  await prisma.analysis.count({ where })
}))
r.push(await medir('tecnico/equipamentos', async () => {
  const where = { tenant_id: tid }
  await prisma.equipment.findMany({ where, include: { category: { select: { name: true } }, preventive_maintenances: { where: { status: 'SCHEDULED' }, orderBy: { scheduled_date: 'asc' }, take: 1 } }, orderBy: { name: 'asc' }, take: 20 })
  await prisma.equipment.count({ where })
}))

const linhas = r.sort((a, b) => b.queries - a.queries).map((x) => `| \`${x.nome}\` | ${x.queries} | ${x.ms} |`).join('\n')
const md = `# PERF-BASELINE — orçamento de queries por página (M-12)

Gerado por \`scripts/perf/measure-queries.mjs\` contra um banco sintético
(\`prisma/seed.ts\` + \`prisma/seed-demo.ts\`). Mede o **primary data fetch replicado** de
cada página (nº de queries ao Prisma + tempo), não o render RSC real.

- Data: ${agora.toISOString().slice(0, 10)}
- Volume do banco: **${vol.readings}** leituras · **${vol.analyses}** análises · **${vol.occurrences}** ocorrências · **${vol.equipment}** equipamentos
- ⚠️ Volume pequeno (seed-demo ~6 meses). Para números de **escala real**, rodar \`scripts/load/\` (k6) num staging com 12+ meses. Use esta tabela como **ordem de grandeza** e **contagem de queries** (o sinal mais estável aqui).

## Baseline (ordenado por nº de queries)

| Página | Queries | Tempo (ms) |
|---|---:|---:|
${linhas}

## Leitura / próximos passos (M-13/M-14)
- **Dashboards** concentram o nº de queries (vários \`count\`/\`groupBy\`/\`aggregate\` por render). Alvos do **M-13**: agregar no banco, cache por tenant, índices compostos comprovados por \`EXPLAIN\`.
- **Listagens** (leituras, análises, ocorrências, auditoria, equipamentos) são enxutas em nº de queries (findMany + count), mas o custo cresce com o volume/includes. Alvo do **M-14**: paginação por cursor, \`take\` obrigatório, export em streaming.
- "Só otimizar o que medir": reexecutar este script após cada otimização e comparar.
`

writeFileSync('docs/auditoria/PERF-BASELINE.md', md)
console.log('PERF-BASELINE.md gerado.')
console.table(r)
await prisma.$disconnect()
