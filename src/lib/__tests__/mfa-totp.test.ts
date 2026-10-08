import { describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { base32Decode, base32Encode } from '@/lib/mfa/base32'
import { hotp, passoDe, totpAt, verificarTotp, gerarSegredo, otpauthUrl } from '@/lib/mfa/totp'
import { cifrar, decifrar, lerChave, MfaKeyError } from '@/lib/mfa/crypto'
import { gerarCodigosRecuperacao, hashCodigoRecuperacao, normalizarCodigoRecuperacao, pareceCodigoRecuperacao } from '@/lib/mfa/recovery'
import { mfaExigeCadastro, mfaMode, rotaLivreSemMfa } from '@/lib/mfa/config'

// Vetores oficiais da RFC 6238 (Apêndice B, SHA-1, segredo ASCII "12345678901234567890"); a RFC lista 8 dígitos,
// aqui comparamos os 6 últimos dígitos (mesmo truncamento dinâmico).
const SEGREDO_RFC = base32Encode(Buffer.from('12345678901234567890'))
const VETORES: Array<[number, string]> = [
  [59, '287082'], [1111111109, '081804'], [1111111111, '050471'],
  [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130'],
]

describe('base32', () => {
  it('ida e volta', () => {
    for (let n = 1; n < 40; n++) {
      const b = randomBytes(n)
      expect(Buffer.from(base32Decode(base32Encode(b)))).toEqual(b)
    }
  })
  it('vetor RFC 4648', () => expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI'))
  it('recusa caractere inválido', () => expect(() => base32Decode('abc1')).toThrow())
})

describe('TOTP — vetores oficiais da RFC 6238', () => {
  it.each(VETORES)('t=%i → %s', (t, esperado) => {
    expect(totpAt(SEGREDO_RFC, t * 1000)).toBe(esperado)
  })
  it('HOTP: vetor da RFC 4226 (contador 0 = 755224)', () => {
    expect(hotp(Buffer.from('12345678901234567890'), 0)).toBe('755224')
  })
})

describe('verificarTotp', () => {
  const t0 = 1_700_000_000_000
  const cod = (ms: number) => totpAt(SEGREDO_RFC, ms)
  it('aceita o passo atual, o anterior e o seguinte (±30 s)', () => {
    for (const d of [-30_000, 0, 30_000]) expect(verificarTotp(SEGREDO_RFC, cod(t0 + d), t0).ok).toBe(true)
  })
  it('recusa dois passos de diferença', () => {
    expect(verificarTotp(SEGREDO_RFC, cod(t0 - 60_000), t0).ok).toBe(false)
    expect(verificarTotp(SEGREDO_RFC, cod(t0 + 60_000), t0).ok).toBe(false)
  })
  it('anti-replay: o passo já usado (e os anteriores) não valem de novo', () => {
    const r = verificarTotp(SEGREDO_RFC, cod(t0), t0, 0)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(verificarTotp(SEGREDO_RFC, cod(t0), t0, r.step).ok).toBe(false)
      expect(verificarTotp(SEGREDO_RFC, cod(t0 - 30_000), t0, r.step).ok).toBe(false)
      // o próximo passo ainda vale
      expect(verificarTotp(SEGREDO_RFC, cod(t0 + 30_000), t0, r.step).ok).toBe(true)
    }
  })
  it('recusa formato errado, espaços são tolerados', () => {
    for (const c of ['', '12345', '1234567', 'abcdef', '12 34 5x']) expect(verificarTotp(SEGREDO_RFC, c, t0).ok).toBe(false)
    const bom = cod(t0)
    expect(verificarTotp(SEGREDO_RFC, `${bom.slice(0, 3)} ${bom.slice(3)}`, t0).ok).toBe(true)
  })
  it('segredo diferente não valida', () => {
    expect(verificarTotp(gerarSegredo(), cod(t0), t0).ok).toBe(false)
  })
  it('gerarSegredo: 160 bits em base32, sempre diferente', () => {
    const a = gerarSegredo(), b = gerarSegredo()
    expect(base32Decode(a).length).toBe(20)
    expect(a).not.toBe(b)
  })
  it('passoDe e otpauth', () => {
    expect(passoDe(59_000)).toBe(1)
    const u = otpauthUrl('Solentis', 'dono@x.com', 'ABC')
    expect(u).toMatch(/^otpauth:\/\/totp\/Solentis%3Adono%40x\.com\?/)
    expect(u).toContain('secret=ABC')
    expect(u).toContain('period=30')
  })
})

describe('cifra do segredo (AES-256-GCM)', () => {
  const key = randomBytes(32)
  it('ida e volta e o texto cifrado não contém o segredo', () => {
    const seg = gerarSegredo()
    const c = cifrar(seg, key)
    expect(c).not.toContain(seg)
    expect(decifrar(c, key)).toEqual({ texto: seg, versao: 1 })
  })
  it('cada cifra usa IV novo', () => expect(cifrar('x', key)).not.toBe(cifrar('x', key)))
  it('chave errada não decifra', () => expect(() => decifrar(cifrar('x', key), randomBytes(32))).toThrow())
  it('adulteração é detectada', () => {
    const [v, iv, tag, ct] = cifrar('segredo-longo-o-bastante', key).split('.')
    const ruim = Buffer.from(ct, 'base64url'); ruim[0] ^= 1
    expect(() => decifrar([v, iv, tag, ruim.toString('base64url')].join('.'), key)).toThrow()
  })
  it('formato desconhecido', () => expect(() => decifrar('lixo', key)).toThrow(MfaKeyError))
  it('lerChave: ausente, curta e boa', () => {
    expect(() => lerChave({})).toThrow(MfaKeyError)
    expect(() => lerChave({ MFA_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') })).toThrow(/32 bytes/)
    expect(lerChave({ MFA_ENCRYPTION_KEY: key.toString('base64') }).length).toBe(32)
  })
})

describe('códigos de recuperação', () => {
  const key = randomBytes(32)
  it('8 códigos distintos no formato xxxxx-xxxxx', () => {
    const c = gerarCodigosRecuperacao()
    expect(c).toHaveLength(8)
    expect(new Set(c).size).toBe(8)
    for (const x of c) expect(x).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/)
  })
  it('hash só com a chave; normaliza hífen, espaço e maiúscula', () => {
    const [c] = gerarCodigosRecuperacao(1)
    expect(hashCodigoRecuperacao(c, key)).toBe(hashCodigoRecuperacao(` ${c.toUpperCase().replace('-', '')} `, key))
    expect(hashCodigoRecuperacao(c, key)).not.toBe(hashCodigoRecuperacao(c, randomBytes(32)))
    expect(hashCodigoRecuperacao(c, key)).not.toContain(normalizarCodigoRecuperacao(c))
  })
  it('distingue código de recuperação de TOTP', () => {
    expect(pareceCodigoRecuperacao('abcde-fghjk')).toBe(true)
    expect(pareceCodigoRecuperacao('123456')).toBe(false)
    expect(pareceCodigoRecuperacao('123 456')).toBe(false)
  })
})

describe('MFA_ENFORCE', () => {
  it('padrão off; required; valor desconhecido vira enroll (não tranca, não desliga)', () => {
    expect(mfaMode({})).toBe('off')
    expect(mfaMode({ MFA_ENFORCE: 'off' })).toBe('off')
    expect(mfaMode({ MFA_ENFORCE: ' REQUIRED ' })).toBe('required')
    expect(mfaMode({ MFA_ENFORCE: 'enroll' })).toBe('enroll')
    expect(mfaMode({ MFA_ENFORCE: 'requird' })).toBe('enroll')
  })
  it('só SUPER_ADMIN sem claim ok, e só no modo required, é levado ao cadastro', () => {
    expect(mfaExigeCadastro('SUPER_ADMIN', 'pending', 'required')).toBe(true)
    expect(mfaExigeCadastro('SUPER_ADMIN', 'none', 'required')).toBe(true)
    expect(mfaExigeCadastro('SUPER_ADMIN', undefined, 'required')).toBe(true)
    expect(mfaExigeCadastro('SUPER_ADMIN', 'ok', 'required')).toBe(false)
    expect(mfaExigeCadastro('SUPER_ADMIN', 'pending', 'enroll')).toBe(false)
    expect(mfaExigeCadastro('SUPER_ADMIN', 'pending', 'off')).toBe(false)
    expect(mfaExigeCadastro('MANAGER', 'none', 'required')).toBe(false)
  })
  it('rotas livres sem MFA: só cadastro e troca de senha', () => {
    for (const r of ['/mfa/cadastro', '/mfa', '/trocar-senha', '/']) expect(rotaLivreSemMfa(r)).toBe(true)
    for (const r of ['/admin/plantas', '/mfaxyz', '/gestor/dashboard']) expect(rotaLivreSemMfa(r)).toBe(false)
  })
})
