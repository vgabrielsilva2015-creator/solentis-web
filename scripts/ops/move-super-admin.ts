/**
 * Move um SUPER_ADMIN existente para a planta da plataforma (oculta). Na máquina do dono, nunca em CI.
 *
 *   # 1) só mostra o plano (não altera nada)
 *   npx tsx scripts/ops/move-super-admin.ts --email dono@seudominio.com --confirm-host <host do DATABASE_URL>
 *   # 2) aplica
 *   npx tsx scripts/ops/move-super-admin.ts --email dono@seudominio.com --confirm-host <host> --apply
 *
 * - só altera o tenant_id do próprio usuário (e derruba as sessões dele: é preciso entrar de novo);
 * - não apaga nada; o histórico de auditoria continua como está;
 * - recusa usuário que não seja SUPER_ADMIN; idempotente;
 * - faça backup do banco antes de usar --apply.
 */
import { PrismaClient } from '@prisma/client'
import { hostDoBanco } from '../../src/lib/super-admin-cli'
import { moverSuperAdmin } from '../../src/server/admin/plataforma'

async function main() {
  const argv = process.argv.slice(2)
  const get = (f: string) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined }
  const email = get('--email')?.trim().toLowerCase()
  const confirmHost = get('--confirm-host')?.trim()
  const apply = argv.includes('--apply')
  if (!email) { console.error('Informe --email.'); process.exit(1) }
  const dbHost = hostDoBanco(process.env.DATABASE_URL)
  if (!dbHost) { console.error('DATABASE_URL ausente ou inválida.'); process.exit(1) }
  if (confirmHost !== dbHost) {
    console.error(`--confirm-host precisa ser o host do DATABASE_URL (${dbHost}). Nada foi feito.`)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const { plano, aplicado } = await moverSuperAdmin(prisma, { email, apply })
    if (!plano.ok) { console.error(plano.error); process.exit(1) }
    console.log(`Host do banco: ${dbHost}`)
    console.log(`Já está na planta da plataforma: ${plano.jaNaPlataforma ? 'sim' : 'não'}`)
    console.log(`Registros de auditoria que citam o usuário: ${plano.referencias.auditLogs} (ficam como estão)`)
    console.log(`Usuários criados por ele: ${plano.referencias.usuariosCriados} (ficam como estão)`)
    console.log(aplicado ? 'APLICADO. As sessões desse usuário foram encerradas.' : apply ? 'Nada a fazer.' : 'Simulação: nada foi alterado. Rode de novo com --apply.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
