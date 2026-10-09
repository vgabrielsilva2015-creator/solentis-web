/** Códigos de recuperação: 8 por cadastro, uso único, guardados só como HMAC. */
import { randomInt } from 'node:crypto'
import { hmacComChave } from './crypto'

export const RECOVERY_CODE_COUNT = 8
// sem 0/o/1/l/i para ninguém errar ao copiar do papel
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789'

export function gerarCodigosRecuperacao(n = RECOVERY_CODE_COUNT): string[] {
  const um = () => Array.from({ length: 5 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  return Array.from({ length: n }, () => `${um()}-${um()}`)
}

/** Aceita maiúsculas, espaços e com/sem hífen. */
export function normalizarCodigoRecuperacao(c: string): string {
  return c.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function pareceCodigoRecuperacao(c: string): boolean {
  return normalizarCodigoRecuperacao(c).length === 10 && !/^\d{6}$/.test(c.replace(/\s/g, ''))
}

export function hashCodigoRecuperacao(c: string, key: Buffer): string {
  return hmacComChave(`recovery:${normalizarCodigoRecuperacao(c)}`, key)
}
