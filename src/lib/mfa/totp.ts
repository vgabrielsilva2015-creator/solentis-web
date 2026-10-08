/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) com SHA-1, 6 dígitos, passo de 30 s — o que todo
 * aplicativo autenticador (Google Authenticator, Authy, 1Password, Microsoft) espera.
 * Só `node:crypto`: nenhuma dependência nova.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { base32Decode, base32Encode } from './base32'

export const TOTP_STEP_SECONDS = 30
export const TOTP_DIGITS = 6
/** Aceita o passo atual e 1 anterior/seguinte (relógio do celular levemente fora). */
export const TOTP_WINDOW = 1

export function gerarSegredo(): string {
  return base32Encode(randomBytes(20)) // 160 bits, o recomendado pela RFC 4226
}

export function hotp(segredo: Uint8Array, contador: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(contador))
  const h = createHmac('sha1', segredo).update(buf).digest()
  const off = h[h.length - 1] & 0x0f
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3]
  return String(bin % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

export function passoDe(nowMs: number): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS)
}

export function totpAt(segredoBase32: string, nowMs: number): string {
  return hotp(base32Decode(segredoBase32), passoDe(nowMs))
}

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export type TotpCheck = { ok: true; step: number } | { ok: false }

/**
 * Confere o código nos passos [atual-1, atual+1]. `lastStep` é o último passo já aceito:
 * só passos MAIORES são aceitos (o mesmo código não vale duas vezes, anti-replay).
 * Percorre sempre todos os passos, para o tempo não depender de qual deles bateu.
 */
export function verificarTotp(segredoBase32: string, codigo: string, nowMs: number, lastStep = 0): TotpCheck {
  const limpo = codigo.replace(/\s/g, '')
  if (!/^\d{6}$/.test(limpo)) return { ok: false }
  const segredo = base32Decode(segredoBase32)
  const atual = passoDe(nowMs)
  let achado = -1
  for (let d = -TOTP_WINDOW; d <= TOTP_WINDOW; d++) {
    const passo = atual + d
    if (iguais(hotp(segredo, passo), limpo) && passo > lastStep && passo > achado) achado = passo
  }
  return achado >= 0 ? { ok: true, step: achado } : { ok: false }
}

export function otpauthUrl(emissor: string, conta: string, segredoBase32: string): string {
  const label = encodeURIComponent(`${emissor}:${conta}`)
  const q = new URLSearchParams({ secret: segredoBase32, issuer: emissor, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) })
  return `otpauth://totp/${label}?${q.toString()}`
}
