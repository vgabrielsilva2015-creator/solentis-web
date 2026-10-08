/**
 * Regras do script que cria o SUPER_ADMIN (scripts/ops/create-super-admin.ts).
 * Separadas do script para poderem ser testadas. T-21: antes existia um
 * create-super.ts com e-mail e senha fixos no código.
 */
import { passwordSchema } from '@/lib/password'
import { PLATAFORMA_SLUG } from '@/server/admin/plataforma'

const SENHAS_PADRAO = ['super@123', 'admin@123', 'tecnico@123', 'operador@123', 'manutencao@123', 'admin123', 'senha123', 'solentis123']

export interface SuperAdminInput {
  email: string
  name: string
  tenantSlug: string
  /** Se informado, cria a planta quando o slug ainda não existe (banco vazio). */
  createTenantName?: string
  confirmHost: string
  password: string
}

export function hostDoBanco(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null
  try { return new URL(databaseUrl).hostname || null } catch { return null }
}

export function validarSenhaSuper(password: string, email: string): string | null {
  const base = passwordSchema.safeParse(password)
  if (!base.success) return base.error.issues[0].message
  if (password.length < 14) return 'Para o super admin, use no mínimo 14 caracteres.'
  if (SENHAS_PADRAO.includes(password.toLowerCase())) return 'Senha padrão conhecida: escolha outra.'
  const local = email.split('@')[0]?.toLowerCase()
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return 'A senha não pode conter o e-mail.'
  return null
}

/** Lê argumentos (--email, --name, --tenant-slug, --create-tenant, --confirm-host) e a senha do ambiente. Sem --tenant-slug a conta vai para a planta da plataforma; senha e e-mail nunca têm valor padrão. */
export function lerEntrada(argv: string[], env: Record<string, string | undefined>): { input?: Omit<SuperAdminInput, 'password'> & { password?: string }; erro?: string } {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
  const email = get('--email')?.trim().toLowerCase()
  const name = get('--name')?.trim()
  // sem --tenant-slug a conta vai para a planta da plataforma (oculta), que é o recomendado
  const tenantSlug = get('--tenant-slug')?.trim() || PLATAFORMA_SLUG
  const createTenantName = get('--create-tenant')?.trim()
  const confirmHost = get('--confirm-host')?.trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: 'Informe --email com um e-mail válido.' }
  if (!name || name.length < 2) return { erro: 'Informe --name.' }
  if (!/^[a-z0-9-]+$/.test(tenantSlug)) return { erro: 'Informe --tenant-slug (letras minúsculas, números e hífens).' }
  if (createTenantName !== undefined && createTenantName.length < 2) return { erro: '--create-tenant precisa do nome da planta.' }
  if (!confirmHost) return { erro: 'Informe --confirm-host com o host do banco que você quer alterar (veja o que o script mostra).' }
  const dbHost = hostDoBanco(env.DATABASE_URL)
  if (!dbHost) return { erro: 'DATABASE_URL ausente ou inválida.' }
  if (confirmHost !== dbHost) return { erro: `--confirm-host (${confirmHost}) não é o host do DATABASE_URL (${dbHost}). Nada foi feito.` }
  return { input: { email, name, tenantSlug, createTenantName, confirmHost, password: env.SUPER_ADMIN_PASSWORD } }
}

/** Argumentos do reset de emergência do 2º fator: --email e --confirm-host (mesma trava do banco certo). */
export function lerEntradaResetMfa(argv: string[], env: Record<string, string | undefined>): { email?: string; erro?: string } {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
  const email = get('--email')?.trim().toLowerCase()
  const confirmHost = get('--confirm-host')?.trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: 'Informe --email com um e-mail válido.' }
  if (!confirmHost) return { erro: 'Informe --confirm-host com o host do banco que você quer alterar.' }
  const dbHost = hostDoBanco(env.DATABASE_URL)
  if (!dbHost) return { erro: 'DATABASE_URL ausente ou inválida.' }
  if (confirmHost !== dbHost) return { erro: `--confirm-host (${confirmHost}) não é o host do DATABASE_URL (${dbHost}). Nada foi feito.` }
  return { email }
}
