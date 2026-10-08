/**
 * Guard único das server actions (T-20).
 *
 *   const ctx = await requirePermission('config.manage')   // redireciona se não puder
 *   ctx.userId, ctx.tenantId, ctx.role
 *
 * ou, em action de formulário que devolve a mensagem na tela:
 *
 *   const ctx = await getActor()
 *   const negado = permissionError(ctx, 'shift.operate')
 *   if (negado) return { error: negado }
 *
 * Antes eram 21 funções `require*` locais com listas de perfis diferentes, cada
 * uma reagindo de um jeito (redirect para /login, throw, `{ error }`), e cada
 * action ainda buscava o próprio id por e-mail (`resolveUserId`).
 *
 * `getActor` lê o usuário no banco a cada action (uma consulta, como o
 * `resolveUserId` fazia): usuário desativado ou apagado perde o acesso na hora,
 * e o PERFIL vem do banco, não do token.
 */
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { mfaExigeCadastro, mfaMode, type MfaClaim } from '@/lib/mfa/config'
import { prisma } from '@/lib/prisma'
import {
  can, DEFAULT_DENIED_MESSAGE, PERMISSION_DENIED_MESSAGE,
  type AppRole, type Permission,
} from './permissions'

export interface ActionCtx {
  userId: string
  tenantId: string
  role: AppRole
  email: string
  name: string
  /** 2º fator desta sessão (só SUPER_ADMIN tem significado) */
  mfa?: MfaClaim
}

/** Usuário logado e ativo nesta planta; sem isso, vai para o login. */
export const getActor = cache(async (): Promise<ActionCtx> => {
  const session = await auth()
  const id = session?.user?.id
  const tenantId = session?.user?.tenantId
  if (!id || !tenantId) redirect('/login')

  const user = await prisma.user.findFirst({
    where: { id, tenant_id: tenantId, is_active: true, deleted_at: null },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) redirect('/login')

  return { userId: user.id, tenantId, role: user.role as AppRole, email: user.email, name: user.name, mfa: session?.user?.mfa ?? 'none' }
})

/** Mensagem para a tela se o perfil não pode; `null` se pode. */
export function permissionError(ctx: Pick<ActionCtx, 'role'>, perm: Permission): string | null {
  return can(ctx.role, perm) ? null : (PERMISSION_DENIED_MESSAGE[perm] ?? DEFAULT_DENIED_MESSAGE)
}

/** Usuário logado com a permissão; sem permissão vai para /acesso-negado. */
export async function requirePermission(perm: Permission): Promise<ActionCtx> {
  const ctx = await getActor()
  if (!can(ctx.role, perm)) redirect('/acesso-negado')
  // Fase 2 do Super Admin: com MFA_ENFORCE=required, nenhuma action de plataforma roda sem o 2º fator
  if (perm === 'platform.admin' && mfaExigeCadastro(ctx.role, ctx.mfa, mfaMode())) redirect('/mfa/cadastro')
  return ctx
}
