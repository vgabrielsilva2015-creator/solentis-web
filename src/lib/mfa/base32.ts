/** Base32 (RFC 4648, sem preenchimento) para o segredo TOTP. */
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let valor = 0
  let out = ''
  for (const b of bytes) {
    valor = (valor << 8) | b
    bits += 8
    while (bits >= 5) {
      out += ALFABETO[(valor >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31]
  return out
}

export function base32Decode(texto: string): Uint8Array {
  const limpo = texto.replace(/[\s=-]/g, '').toUpperCase()
  let bits = 0
  let valor = 0
  const out: number[] = []
  for (const ch of limpo) {
    const i = ALFABETO.indexOf(ch)
    if (i < 0) throw new Error('Base32 inválido')
    valor = (valor << 5) | i
    bits += 5
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Uint8Array.from(out)
}
