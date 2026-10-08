/**
 * Segundo fator do Super Admin (Fase 2). Regra sem sessão e sem HTTP: quem chama
 * (authorize, actions da tela de cadastro, script de emergência) passa o cliente do
 * banco, a chave e o relógio. Escopo de usuário: as tabelas não têm tenant_id.
 */
import type { PrismaClient, Prisma } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { cifrar, decifrar, MFA_KEY_VERSION } from '@/lib/mfa/crypto'
import { gerarSegredo, otpauthUrl, verificarTotp } from '@/lib/mfa/totp'
import { gerarCodigosRecuperacao, hashCodigoRecuperacao, pareceCodigoRecuperacao } from '@/lib/mfa/recovery'
import { MFA_FAIL_LIMIT, MFA_WINDOW_MS, buckets, countRecent, recordEvents } from '@/lib/rate-limit'

type Db = PrismaClient | Prisma.TransactionClient

export type EstadoMfa = 'none' | 'pending' | 'enabled'

export async function estadoMfa(db: Db, userId: string): Promise<EstadoMfa> {
  const m = await db.userMfa.findUnique({ where: { user_id: userId }, select: { enabled_at: true } })
  if (!m) return 'none'
  return m.enabled_at ? 'enabled' : 'pending'
}

/** Inicia (ou reinicia, se ainda não confirmado) o cadastro: devolve o segredo para o QR/entrada manual. */
export async function iniciarCadastro(
  db: Db, p: { userId: string; email: string; key: Buffer; emissor?: string },
): Promise<{ ok: true; segredo: string; otpauth: string } | { ok: false; error: string }> {
  if ((await estadoMfa(db, p.userId)) === 'enabled') return { ok: false, error: 'O segundo fator já está ativo nesta conta.' }
  const segredo = gerarSegredo()
  const secret_enc = cifrar(segredo, p.key, MFA_KEY_VERSION)
  await db.userMfa.upsert({
    where: { user_id: p.userId },
    create: { user_id: p.userId, secret_enc, key_version: MFA_KEY_VERSION },
    update: { secret_enc, key_version: MFA_KEY_VERSION, enabled_at: null, last_step: 0 },
  })
  return { ok: true, segredo, otpauth: otpauthUrl(p.emissor ?? 'Solentis', p.email, segredo) }
}

/** Confirma o cadastro com o primeiro código e devolve os códigos de recuperação (única vez em texto). */
export async function confirmarCadastro(
  prisma: PrismaClient,
  p: { userId: string; tenantId: string; code: string; key: Buffer; nowMs: number },
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  if (await bloqueado(p.userId)) return { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos.' }
  const m = await prisma.userMfa.findUnique({ where: { user_id: p.userId } })
  if (!m) return { ok: false, error: 'Inicie o cadastro primeiro.' }
  if (m.enabled_at) return { ok: false, error: 'O segundo fator já está ativo nesta conta.' }
  const segredo = decifrar(m.secret_enc, p.key).texto
  const v = verificarTotp(segredo, p.code, p.nowMs, 0)
  if (!v.ok) {
    await recordEvents([buckets.mfaUser(p.userId)]).catch(() => {})
    return { ok: false, error: 'Código incorreto. Confira o código atual do aplicativo.' }
  }
  const codigos = gerarCodigosRecuperacao()
  await prisma.$transaction(async (tx) => {
    await tx.userMfa.update({ where: { user_id: p.userId }, data: { enabled_at: new Date(p.nowMs), last_step: v.step } })
    await tx.mfaRecoveryCode.deleteMany({ where: { user_id: p.userId } })
    await tx.mfaRecoveryCode.createMany({
      data: codigos.map((c) => ({ user_id: p.userId, code_hash: hashCodigoRecuperacao(c, p.key) })),
    })
    await logAudit(tx, {
      tenantId: p.tenantId, userId: p.userId, action: 'CREATE', tableName: 'user_mfa', recordId: p.userId,
      after: { mfa: 'ativado' },
    })
  })
  return { ok: true, recoveryCodes: codigos }
}

async function bloqueado(userId: string): Promise<boolean> {
  try {
    return (await countRecent(buckets.mfaUser(userId), MFA_WINDOW_MS)) >= MFA_FAIL_LIMIT
  } catch {
    return false // fail-open, igual ao limite do login
  }
}

export type ResultadoSegundoFator = { ok: true; via: 'totp' | 'recovery' } | { ok: false; motivo: 'invalido' | 'bloqueado' }

/**
 * Confere o segundo fator no login: código de 6 dígitos (anti-replay) ou código de recuperação (uso único).
 * Falhas contam por usuário: 10 em 15 min bloqueiam o segundo fator dessa conta, de qualquer IP.
 */
export async function verificarSegundoFator(
  db: Db, p: { userId: string; entrada: string; key: Buffer; nowMs: number },
): Promise<ResultadoSegundoFator> {
  if (await bloqueado(p.userId)) return { ok: false, motivo: 'bloqueado' }
  const falha = async (): Promise<ResultadoSegundoFator> => {
    await recordEvents([buckets.mfaUser(p.userId)]).catch(() => {})
    return { ok: false, motivo: 'invalido' }
  }
  const m = await db.userMfa.findUnique({ where: { user_id: p.userId } })
  if (!m || !m.enabled_at) return falha()

  if (pareceCodigoRecuperacao(p.entrada)) {
    const r = await db.mfaRecoveryCode.updateMany({
      where: { user_id: p.userId, code_hash: hashCodigoRecuperacao(p.entrada, p.key), used_at: null },
      data: { used_at: new Date(p.nowMs) },
    })
    return r.count === 1 ? { ok: true, via: 'recovery' } : falha()
  }

  const segredo = decifrar(m.secret_enc, p.key).texto
  const v = verificarTotp(segredo, p.entrada, p.nowMs, Number(m.last_step))
  if (!v.ok) return falha()
  // atômico: só avança se ninguém usou este passo (ou um maior) entre a leitura e agora
  const r = await db.userMfa.updateMany({ where: { user_id: p.userId, last_step: { lt: v.step } }, data: { last_step: v.step } })
  return r.count === 1 ? { ok: true, via: 'totp' } : falha()
}

/** Quantos códigos de recuperação ainda valem. */
export async function recuperacaoRestante(db: Db, userId: string): Promise<number> {
  return db.mfaRecoveryCode.count({ where: { user_id: userId, used_at: null } })
}

/** Emergência (script com acesso ao banco): apaga o segundo fator da conta para ela recadastrar. */
export async function redefinirMfa(prisma: PrismaClient, p: { userId: string; tenantId: string; atorId?: string | null }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { user_id: p.userId } })
    await tx.userMfa.deleteMany({ where: { user_id: p.userId } })
    await logAudit(tx, {
      tenantId: p.tenantId, userId: p.atorId ?? null, action: 'DELETE', tableName: 'user_mfa', recordId: p.userId,
      before: { mfa: 'ativado' }, after: { mfa: 'redefinido por script de emergência' }, ip: null,
    })
  })
}

