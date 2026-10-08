/**
 * Cria um usuário (operador por padrão). Rode na sua máquina, com o DATABASE_URL do banco alvo:
 *
 *   NEW_USER_PASSWORD='SenhaTemporaria2026' npx tsx scripts/ops/create-user.ts \
 *     --email operador@suaempresa.com --name "Nome do Operador" --role OPERATOR \
 *     --tenant-slug <slug-da-planta> --confirm-host <host do DATABASE_URL>
 *
 * Se a planta não existir mais, acrescente  --create-tenant "Nome da Planta"  e ela é criada junto.
 *
 * - não há senha, e-mail ou planta padrão; a senha vem de NEW_USER_PASSWORD;
 * - o usuário é obrigado a trocar a senha no primeiro login;
 * - só cria: e-mail já existente para tudo e nada é sobrescrito;
 * - --confirm-host precisa ser o host do DATABASE_URL (evita gravar no banco errado);
 * - o script nunca imprime a senha.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../../src/lib/password'
import { lerEntradaUsuario, validarSenhaUsuario } from '../../src/lib/user-cli'

async function main() {
  const lido = lerEntradaUsuario(process.argv.slice(2), process.env)
  if (lido.erro || !lido.input) { console.error(lido.erro); process.exit(1) }
  const { email, name, role, tenantSlug, createTenantName, password } = lido.input
  if (!password) { console.error('Defina NEW_USER_PASSWORD no ambiente.'); process.exit(1) }
  const problema = validarSenhaUsuario(password, email)
  if (problema) { console.error(problema); process.exit(1) }

  const prisma = new PrismaClient()
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      console.error('Já existe um usuário com este e-mail. Nada foi alterado.'); process.exit(1)
    }
    let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) {
      if (!createTenantName) {
        console.error(`Planta com slug "${tenantSlug}" não encontrada. Para criá-la junto, use --create-tenant "Nome da Planta".`)
        process.exit(1)
      }
      tenant = await prisma.tenant.create({ data: { name: createTenantName, slug: tenantSlug } })
      console.log(`Planta criada: ${tenant.name} (${tenant.slug})`)
    }
    const user = await prisma.user.create({
      data: {
        tenant_id: tenant.id, email, name, role,
        password_hash: await hashPassword(password),
        must_change_password: true, is_active: true,
      },
    })
    console.log(`Usuário criado: ${user.email} (${role}) na planta ${tenant.slug}. Ele troca a senha no primeiro login.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('Falha:', e instanceof Error ? e.message : 'erro desconhecido'); process.exit(1) })
