/**
 * Cria um SUPER_ADMIN. Uso (na máquina do dono, nunca em CI):
 *
 *   SUPER_ADMIN_PASSWORD='...' npx tsx scripts/ops/create-super-admin.ts \
 *     --email dono@seudominio.com --name "Seu Nome" \
 *     [--tenant-slug <slug>] [--create-tenant "Nome da Planta"] --confirm-host <host do DATABASE_URL>
 *
 * Sem --tenant-slug a conta é criada na planta da plataforma (oculta; criada se não existir) — o recomendado.
 * Com --tenant-slug de uma planta que ainda não existe (banco vazio), --create-tenant cria a planta junto.
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
import { PLATAFORMA_SLUG, garantirPlantaPlataforma } from '../../src/server/admin/plataforma'

async function main() {
  const lido = lerEntrada(process.argv.slice(2), process.env)
  if (lido.erro || !lido.input) { console.error(lido.erro); process.exit(1) }
  const { email, name, tenantSlug, createTenantName, password } = lido.input
  if (!password) { console.error('Defina SUPER_ADMIN_PASSWORD no ambiente.'); process.exit(1) }
  const problema = validarSenhaSuper(password, email)
  if (problema) { console.error(problema); process.exit(1) }

  const prisma = new PrismaClient()
  try {
    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) { console.error('Já existe um usuário com este e-mail. Nada foi alterado.'); process.exit(1) }
    const passwordHash = await hashPassword(password)
    const user = await prisma.$transaction(async (tx) => {
      let tenant = tenantSlug === PLATAFORMA_SLUG
        ? await garantirPlantaPlataforma(tx)
        : await tx.tenant.findUnique({ where: { slug: tenantSlug } })
      if (!tenant) {
        if (!createTenantName) throw new Error(`Planta com slug "${tenantSlug}" não encontrada. Para criá-la junto, use --create-tenant "Nome da Planta".`)
        tenant = await tx.tenant.create({ data: { name: createTenantName, slug: tenantSlug } })
        console.log(`Planta criada: ${tenant.name} (${tenant.slug})`)
      }
      return tx.user.create({
        data: {
          tenant_id: tenant.id, email, name, role: 'SUPER_ADMIN',
          password_hash: passwordHash, must_change_password: false, is_active: true,
        },
      })
    })
    console.log(`SUPER_ADMIN criado: ${user.email}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
