'use server'

import qrcode from 'qrcode-generator'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getActor, permissionError } from '@/server/auth/guards'
import { getLogger } from '@/lib/logger'
import { verifyPassword } from '@/lib/password'
import { buckets, countRecent, recordEvents, PWCHANGE_FAIL_LIMIT, PWCHANGE_WINDOW_MS } from '@/lib/rate-limit'
import { lerChave, MfaKeyError } from '@/lib/mfa/crypto'
import { BUMP_SESSION_VERSION } from '@/lib/session-version'
import { confirmarCadastro, iniciarCadastro } from '@/server/mfa/service'

export type CadastroState = {
  error?: string
  /** passo 2: QR + chave para digitar à mão */
  qr?: { dataUrl: string; segredo: string }
  /** passo 3: códigos de recuperação (aparecem uma única vez) */
  recoveryCodes?: string[]
}

const SenhaSchema = z.object({ password: z.string().min(1).max(128) })
const CodigoSchema = z.object({ code: z.string().min(6).max(12) })

/** Passo 1 → 2: confirma a SENHA de novo (sessão roubada não cadastra o autenticador do atacante) e gera o segredo. */
export async function iniciarCadastroMfa(_prev: CadastroState, formData: FormData): Promise<CadastroState> {
  const ctx = await getActor()
  const negado = permissionError(ctx, 'platform.admin')
  if (negado) return { error: negado }

  const parsed = SenhaSchema.safeParse({ password: formData.get('password') })
  if (!parsed.success) return { error: 'Informe a sua senha para continuar.' }

  const bucket = buckets.passwordChange(ctx.userId)
  if ((await countRecent(bucket, PWCHANGE_WINDOW_MS)) >= PWCHANGE_FAIL_LIMIT) {
    return { error: 'Muitas tentativas. Tente novamente mais tarde.' }
  }
  // @tenant-checked: usuário do próprio ator (getActor), lido pela PK
  const u = await prisma.user.findFirst({ where: { id: ctx.userId, tenant_id: ctx.tenantId }, select: { password_hash: true } })
  if (!u || !(await verifyPassword(parsed.data.password, u.password_hash))) {
    await recordEvents([bucket]).catch(() => {})
    return { error: 'Senha incorreta.' }
  }

  try {
    const r = await iniciarCadastro(prisma, { userId: ctx.userId, email: ctx.email, key: lerChave() })
    if (!r.ok) return { error: r.error }
    const qr = qrcode(0, 'M')
    qr.addData(r.otpauth)
    qr.make()
    return { qr: { dataUrl: qr.createDataURL(5, 8), segredo: r.segredo } }
  } catch (e) {
    const log = await getLogger({ action: 'iniciarCadastroMfa', userId: ctx.userId })
    log.error({ err: e }, 'Falha ao iniciar o cadastro do segundo fator')
    return { error: e instanceof MfaKeyError ? 'O segundo fator ainda não foi configurado no servidor (chave de cifra ausente).' : 'Não foi possível iniciar o cadastro agora.' }
  }
}

/** Passo 2 → 3: confere o primeiro código; ativa; derruba as sessões abertas (a próxima entrada já pede o código). */
export async function confirmarCadastroMfa(_prev: CadastroState, formData: FormData): Promise<CadastroState> {
  const ctx = await getActor()
  const negado = permissionError(ctx, 'platform.admin')
  if (negado) return { error: negado }

  const parsed = CodigoSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) return { error: 'Digite o código de 6 dígitos do aplicativo.' }

  try {
    const r = await confirmarCadastro(prisma, { userId: ctx.userId, tenantId: ctx.tenantId, code: parsed.data.code, key: lerChave(), nowMs: Date.now() })
    if (!r.ok) return { error: r.error }
    // @tenant-checked: usuário do próprio ator (getActor)
    await prisma.user.updateMany({ where: { id: ctx.userId, tenant_id: ctx.tenantId }, data: { ...BUMP_SESSION_VERSION } })
    return { recoveryCodes: r.recoveryCodes }
  } catch (e) {
    const log = await getLogger({ action: 'confirmarCadastroMfa', userId: ctx.userId })
    log.error({ err: e }, 'Falha ao confirmar o cadastro do segundo fator')
    return { error: 'Não foi possível confirmar agora.' }
  }
}
