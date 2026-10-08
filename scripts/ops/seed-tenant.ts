/**
 * Mobilia "de fábrica" uma planta JÁ existente (backfill). Util para plantas criadas
 * antes do seed automático, que nasceram vazias. Uso:
 *
 *   npx tsx scripts/ops/seed-tenant.ts --tenant-slug <slug> --confirm-host <host do DATABASE_URL>
 *
 * - idempotente: cadastros que já existirem na planta não são duplicados;
 * - --confirm-host precisa ser o host do DATABASE_URL (evita gravar no banco errado);
 * - usa um usuário da própria planta como autor dos cadastros (created_by/updated_by).
 */
import { PrismaClient } from '@prisma/client'
import { hostDoBanco } from '../../src/lib/super-admin-cli'
import { seedTenantDefaults } from '../../src/lib/tenant-defaults'

function lerArgs(argv: string[]) {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
  return { tenantSlug: get('--tenant-slug')?.trim(), confirmHost: get('--confirm-host')?.trim() }
}

async function main() {
  const { tenantSlug, confirmHost } = lerArgs(process.argv.slice(2))
  if (!tenantSlug) { console.error('Informe --tenant-slug.'); process.exit(1) }
  if (!confirmHost) { console.error('Informe --confirm-host com o host do DATABASE_URL.'); process.exit(1) }
  const dbHost = hostDoBanco(process.env.DATABASE_URL)
  if (!dbHost) { console.error('DATABASE_URL ausente ou inválida.'); process.exit(1) }
  if (confirmHost !== dbHost) { console.error(`--confirm-host (${confirmHost}) não é o host do DATABASE_URL (${dbHost}). Nada foi feito.`); process.exit(1) }

  const prisma = new PrismaClient()
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) { console.error(`Planta com slug "${tenantSlug}" não encontrada.`); process.exit(1) }

    // Autor dos cadastros: um gestor da planta, ou qualquer usuário dela.
    const autor =
      (await prisma.user.findFirst({ where: { tenant_id: tenant.id, role: 'MANAGER' }, select: { id: true } })) ??
      (await prisma.user.findFirst({ where: { tenant_id: tenant.id }, select: { id: true } }))
    if (!autor) { console.error('A planta não tem nenhum usuário para usar como autor dos cadastros. Crie o gestor antes.'); process.exit(1) }

    await prisma.$transaction((tx) => seedTenantDefaults(tx, tenant.id, autor.id), { timeout: 30000 })
    console.log(`Planta "${tenant.name}" (${tenant.slug}) mobiliada de fábrica.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
