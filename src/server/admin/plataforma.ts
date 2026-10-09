/**
 * Plataforma e super admins (Fase 1 do painel de Super Admin).
 *
 * Os super admins moram numa planta própria e oculta ("plataforma"), e não dentro da planta de um
 * cliente: assim não aparecem nas listas nem nas contagens do cliente, e um Gestor do cliente não
 * alcança a conta deles (as actions do gestor só enxergam a própria planta).
 *
 * Tudo aqui recebe o cliente do Prisma por parâmetro (serve ao painel e aos scripts) e opera entre
 * plantas de propósito — por isso as consultas levam `@tenant-safe` com a justificativa.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { BUMP_SESSION_VERSION } from '@/lib/session-version'
import { logAudit } from '@/lib/audit'

export const PLATAFORMA_SLUG = 'solentis-plataforma'
export const PLATAFORMA_NOME = 'Solentis (plataforma)'

export function ehPlantaPlataforma(slug: string | null | undefined): boolean {
  return slug === PLATAFORMA_SLUG
}

/** Planta da plataforma (cria se não existir). */
export async function garantirPlantaPlataforma(tx: Prisma.TransactionClient) {
  // @tenant-safe: a planta da plataforma é global por definição (slug único)
  const existente = await tx.tenant.findUnique({ where: { slug: PLATAFORMA_SLUG } })
  if (existente) return existente
  return tx.tenant.create({ data: { name: PLATAFORMA_NOME, slug: PLATAFORMA_SLUG, is_active: true } })
}

export type PlanoMovimentacao =
  | { ok: false; error: string }
  | {
      ok: true
      jaNaPlataforma: boolean
      userId: string
      deTenantId: string
      referencias: { auditLogs: number; usuariosCriados: number }
    }

export interface ResultadoMovimentacao {
  plano: PlanoMovimentacao
  aplicado: boolean
}

/**
 * Move um SUPER_ADMIN para a planta da plataforma. Por padrão só mostra o plano (`apply: false`).
 * Só altera `tenant_id` do próprio usuário (e derruba as sessões dele uma vez); nada é apagado e o
 * histórico de auditoria fica como está. Idempotente.
 */
export async function moverSuperAdmin(
  prisma: PrismaClient,
  i: { email: string; apply: boolean },
): Promise<ResultadoMovimentacao> {
  // @tenant-safe: operação de plataforma, localiza o super admin por e-mail (único no banco)
  const user = await prisma.user.findUnique({
    where: { email: i.email },
    select: { id: true, role: true, tenant_id: true, tenant: { select: { slug: true } } },
  })
  if (!user) return { plano: { ok: false, error: 'Usuário não encontrado.' }, aplicado: false }
  if (user.role !== 'SUPER_ADMIN') {
    return { plano: { ok: false, error: 'Este usuário não é SUPER_ADMIN. Nada foi alterado.' }, aplicado: false }
  }

  const [auditLogs, usuariosCriados] = await Promise.all([
    // @tenant-safe: contagem informativa de referências ao usuário, entre plantas
    prisma.auditLog.count({ where: { user_id: user.id } }),
    // @tenant-safe: idem
    prisma.user.count({ where: { created_by: user.id } }),
  ])
  const jaNaPlataforma = ehPlantaPlataforma(user.tenant.slug)
  const plano: PlanoMovimentacao = {
    ok: true, jaNaPlataforma, userId: user.id, deTenantId: user.tenant_id, referencias: { auditLogs, usuariosCriados },
  }
  if (!i.apply || jaNaPlataforma) return { plano, aplicado: false }

  await prisma.$transaction(async (tx) => {
    const plataforma = await garantirPlantaPlataforma(tx)
    // @tenant-safe: o próprio super admin, localizado acima; só o tenant_id muda
    await tx.user.update({ where: { id: user.id }, data: { tenant_id: plataforma.id, ...BUMP_SESSION_VERSION } })
    await logAudit(tx, {
      tenantId: plataforma.id, userId: user.id, action: 'UPDATE', tableName: 'users', recordId: user.id,
      before: { tenant_id: user.tenant_id }, after: { tenant_id: plataforma.id },
      justification: 'Super admin movido para a planta da plataforma',
    })
  })
  return { plano, aplicado: true }
}

// ─── Lista de plantas dos clientes (sem a plataforma) ────────────────────────

export function plantasDeClientes(prisma: PrismaClient) {
  // @tenant-safe: painel de plataforma lista todas as plantas de clientes
  return prisma.tenant.findMany({
    where: { slug: { not: PLATAFORMA_SLUG } },
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { users: true } } },
  })
}

// ─── Último super admin ativo ────────────────────────────────────────────────

/**
 * Ativa/desativa um usuário pelo painel, com a regra de que nunca sobra zero super admins ativos.
 * Os super admins ativos são travados (FOR UPDATE) na transação: dois admins desativando um ao
 * outro ao mesmo tempo não conseguem os dois (o segundo enxerga o primeiro já confirmado).
 */
export async function alternarAtivoUsuarioPlataforma(
  prisma: PrismaClient,
  i: { actorId: string; userId: string },
): Promise<{ error?: string; isActive?: boolean; tenantId?: string }> {
  if (i.actorId === i.userId) return { error: 'Você não pode desativar a sua própria conta.' }

  return prisma.$transaction(async (tx) => {
    // Trava os super admins ativos antes de decidir (ordem fixa por id, evita deadlock entre duas desativações).
    await tx.$queryRaw`SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = true AND deleted_at IS NULL ORDER BY id FOR UPDATE`

    // @tenant-safe: super admin opera entre plantas de propósito; alvo por PK global
    const alvo = await tx.user.findUnique({
      where: { id: i.userId },
      select: { id: true, tenant_id: true, is_active: true, role: true, deleted_at: true },
    })
    if (!alvo) return { error: 'Usuário não encontrado.' }

    const novoStatus = !alvo.is_active
    if (!novoStatus && alvo.role === 'SUPER_ADMIN') {
      // @tenant-safe: contagem de super admins ativos na plataforma inteira
      const outros = await tx.user.count({
        where: { role: 'SUPER_ADMIN', is_active: true, deleted_at: null, id: { not: alvo.id } },
      })
      if (outros < 1) return { error: 'Precisa existir ao menos um super admin ativo.' }
    }

    // @tenant-safe: toggle por super admin, alvo por PK global
    await tx.user.update({ where: { id: alvo.id }, data: { is_active: novoStatus, ...BUMP_SESSION_VERSION } })
    await logAudit(tx, {
      tenantId: alvo.tenant_id, userId: i.actorId, action: 'UPDATE', tableName: 'users', recordId: alvo.id,
      before: { is_active: alvo.is_active }, after: { is_active: novoStatus },
    })
    return { isActive: novoStatus, tenantId: alvo.tenant_id }
  })
}

// ─── Alterar o perfil/função de um usuário (painel de plataforma) ────────────

/** Perfis que o super admin pode atribuir pelo painel. SUPER_ADMIN fica de fora (conta de sistema). */
const PAPEIS_EDITAVEIS = ['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE'] as const

/**
 * Altera o perfil de um usuário de planta. Troca o `role` e invalida as sessões abertas
 * (`BUMP_SESSION_VERSION`), para o acesso passar a valer com o novo perfil na hora.
 * Não altera o próprio ator nem um SUPER_ADMIN.
 */
export async function alterarPapelUsuarioPlataforma(
  prisma: PrismaClient,
  i: { actorId: string; userId: string; novoPapel: string },
): Promise<{ error?: string; role?: string; tenantId?: string }> {
  if (!(PAPEIS_EDITAVEIS as readonly string[]).includes(i.novoPapel)) {
    return { error: 'Perfil inválido. Use Operador, Técnico, Gestor ou Manutenção.' }
  }
  if (i.actorId === i.userId) return { error: 'Você não pode alterar o seu próprio perfil.' }

  return prisma.$transaction(async (tx) => {
    // @tenant-safe: super admin opera entre plantas de propósito; alvo por PK global
    const alvo = await tx.user.findUnique({
      where: { id: i.userId },
      select: { id: true, tenant_id: true, role: true, deleted_at: true },
    })
    if (!alvo || alvo.deleted_at) return { error: 'Usuário não encontrado.' }
    if (alvo.role === 'SUPER_ADMIN') {
      return { error: 'Não é possível alterar o perfil de um super admin por aqui.' }
    }
    if (alvo.role === i.novoPapel) return { role: i.novoPapel, tenantId: alvo.tenant_id }

    // @tenant-safe: alteração por super admin, alvo por PK global
    await tx.user.update({ where: { id: alvo.id }, data: { role: i.novoPapel, ...BUMP_SESSION_VERSION } })
    await logAudit(tx, {
      tenantId: alvo.tenant_id, userId: i.actorId, action: 'UPDATE', tableName: 'users', recordId: alvo.id,
      before: { role: alvo.role }, after: { role: i.novoPapel },
    })
    return { role: i.novoPapel, tenantId: alvo.tenant_id }
  })
}
