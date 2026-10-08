/**
 * Emergência: apaga o segundo fator (TOTP + códigos de recuperação) de UM super admin para ele
 * recadastrar. Use quando ele perdeu o celular E os códigos de recuperação, ou se a chave de cifra
 * (MFA_ENCRYPTION_KEY) foi perdida.
 *
 *   npx tsx scripts/ops/reset-mfa.ts --email dono@seudominio.com --confirm-host <host do DATABASE_URL>
 *
 * - só funciona com acesso ao banco (quem tem a DATABASE_URL); não existe caminho pela internet;
 * - só atua em contas SUPER_ADMIN; derruba as sessões abertas da conta; deixa registro em audit_logs;
 * - o host do banco precisa ser confirmado (evita rodar no banco errado).
 */
import { PrismaClient } from '@prisma/client'
import { lerEntradaResetMfa } from '../../src/lib/super-admin-cli'
import { redefinirMfa } from '../../src/server/mfa/service'

async function main() {
  const lido = lerEntradaResetMfa(process.argv.slice(2), process.env)
  if (lido.erro || !lido.email) { console.error(lido.erro); process.exit(1) }

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: lido.email }, select: { id: true, tenant_id: true, role: true, email: true } })
    if (!user || user.role !== 'SUPER_ADMIN') { console.error('Nenhum super admin com este e-mail. Nada foi alterado.'); process.exit(1) }
    await redefinirMfa(prisma, { userId: user.id, tenantId: user.tenant_id, atorId: null })
    await prisma.user.update({ where: { id: user.id }, data: { session_version: { increment: 1 } } })
    console.log(`Segundo fator removido de ${user.email}. Ele entra com a senha e cadastra o autenticador de novo em /mfa/cadastro.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
