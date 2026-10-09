/**
 * Cifra do segredo TOTP: AES-256-GCM. A chave NÃO fica no banco: vem de
 * MFA_ENCRYPTION_KEY (32 bytes em base64), variável sensível da Vercel.
 * Banco vazado sem a chave não revela os segredos.
 *
 * Formato guardado: `v<versão>.<iv>.<tag>.<texto>` (base64url). A versão permite
 * trocar a chave no futuro; hoje só existe a versão 1.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

export const MFA_KEY_VERSION = 1

export class MfaKeyError extends Error {}

export function lerChave(env: Record<string, string | undefined> = process.env): Buffer {
  const b64 = env.MFA_ENCRYPTION_KEY
  if (!b64) throw new MfaKeyError('MFA_ENCRYPTION_KEY ausente.')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new MfaKeyError('MFA_ENCRYPTION_KEY precisa ter 32 bytes em base64.')
  return key
}

export function cifrar(texto: string, key: Buffer, versao = MFA_KEY_VERSION): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [`v${versao}`, iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

export function decifrar(guardado: string, key: Buffer): { texto: string; versao: number } {
  const [v, iv, tag, ct] = guardado.split('.')
  if (!v || !/^v\d+$/.test(v) || !iv || !tag || !ct) throw new MfaKeyError('Segredo em formato desconhecido.')
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  const texto = Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8')
  return { texto, versao: Number(v.slice(1)) }
}

/** HMAC com a chave do MFA: usado nos códigos de recuperação (hash que só quem tem a chave refaz). */
export function hmacComChave(valor: string, key: Buffer): string {
  return createHmac('sha256', key).update(valor).digest('hex')
}
