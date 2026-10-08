/**
 * Cria um SUPER_ADMIN. Uso (na máquina do dono, nunca em CI):
 *
 *   SUPER_ADMIN_PASSWORD='...' npx tsx scripts/ops/create-super-admin.ts \
 *     --email dono@seudominio.com --name "Seu Nome" \
 *     --tenant-slug <slug-da-planta> --confirm-host <host do DATABASE_URL>
 *
 * Num banco vazio (sem nenhuma planta), acrescente  --create-tenant "Nome da Planta"  e a planta
 * de sistema é criada junto, para o super admin ter onde morar. Ele depois cria as plantas reais pela UI.
 *
 * - não existe senha nem e-mail padrão; a senha vem do ambiente (não vai para o histórico do shell se
 *   você usar `read -s SUPER_ADMIN_PASSWORD; export SUPER_ADMIN_PASSWORD`);
 * - só cria: se o e-mail já existe, para (nada é sobrescrito);
 * - --confirm-host precisa ser o host do DATABASE_URL, para não criar conta no banco errado;
 * - o script nunca imprime a senha.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../../src/lib/password'
import { lerEntrada, validarSenhaSuper } from '../../src/lib/super-admin-cli'

async function main() {
  const lido = lerEntrada(process.argv.slice(2), process.env)
  if (lido.erro || !lido.input) { console.error(lido.erro); process.exit(1) }
  const { email, name, tenantSlug, createTenantName, password } = lido.input
  if (!password) { console.error('Defina SUPER_ADMIN_PASSWORD no ambiente.'); process.exit(1) }
  const problema = validarSenhaSuper(password, email)
  if (problema) { console.error(problema); process.exit(1) }

  const prisma = new PrismaClient()
  try {
    let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) {
      if (!createTenantName) {
        console.error(`Planta com slug "${tenantSlug}" não encontrada. Para criá-la junto, use --create-tenant "Nome da Planta".`)
        process.exit(1)
      }
      tenant = await prisma.tenant.create({ data: { name: createTenantName, slug: tenantSlug } })
      console.log(`Planta criada: ${tenant.name} (${tenant.slug})`)
    }
    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) { console.error('Já existe um usuário com este e-mail. Nada foi alterado.'); process.exit(1) }
    const user = await prisma.user.create({
      data: {
        tenant_id: tenant.id, email, name, role: 'SUPER_ADMIN',
        password_hash: await hashPassword(password),
        must_change_password: false, is_active: true,
      },
    })
    console.log(`SUPER_ADMIN criado: ${user.email}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
