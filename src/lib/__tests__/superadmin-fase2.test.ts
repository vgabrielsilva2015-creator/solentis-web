/**
 * Super Admin — Fase 2 (MFA). Amarrações em arquivo; o comportamento está em
 * p0-mfa.int.test.ts (banco) e tests/superadmin-mfa.spec.ts (navegador).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { limparEvento } from '@/lib/sentry-config'
import { REDACT_PATHS } from '@/lib/logger'
import { loginErrorMessage, LOGIN_MFA_INVALID_CODE, LOGIN_MFA_REQUIRED_CODE, MFA_MESSAGES } from '@/lib/user-errors'
import { lerEntradaResetMfa } from '@/lib/super-admin-cli'

const raiz = process.cwd()
const ler = (p: string) => readFileSync(join(raiz, p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('authorize: o segundo fator vem depois da senha e antes de qualquer efeito de login', () => {
  const t = semComentarios(ler('src/lib/auth.ts'))
  const iSenha = t.indexOf('await verifyPassword(password, user.password_hash)')
  const iAtivo = t.indexOf('!user.is_active')
  const iMfa = t.indexOf("mfaMode() !== 'off'")
  const iUltimo = t.indexOf('last_login_at: new Date()')
  it('ordem: senha → conta ativa → segundo fator → last_login_at', () => {
    expect(iSenha).toBeGreaterThan(0)
    expect(iAtivo).toBeGreaterThan(iSenha)
    expect(iMfa).toBeGreaterThan(iAtivo)
    expect(iUltimo).toBeGreaterThan(iMfa)
  })
  it('só vale para SUPER_ADMIN', () => expect(t).toMatch(/user\.role === 'SUPER_ADMIN' && mfaMode\(\) !== 'off'/))
  it('fail-closed: erro ao consultar o estado ou ao verificar o código NUNCA deixa passar', () => {
    const bloco = t.slice(iMfa, iUltimo)
    expect((bloco.match(/throw new Error\(LOGIN_UNAVAILABLE_CODE\)/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(bloco).toContain('LOGIN_MFA_REQUIRED_CODE')
    expect(bloco).toContain('LOGIN_MFA_INVALID_CODE')
    // quem tem MFA ativo só ganha o claim 'ok' depois de ok === true
    expect(bloco).toMatch(/if \(!ok\) \{[\s\S]*?throw new Error\(LOGIN_MFA_INVALID_CODE\)[\s\S]*?\}\s*mfa = 'ok'/)
  })
  it('falha de código conta no limitador de login (falhou())', () => {
    expect(t.slice(iMfa, iUltimo)).toMatch(/await falhou\(\)/)
  })
  it('o claim vai para o token e para a sessão', () => {
    expect(ler('src/lib/auth.config.ts')).toMatch(/token\.mfa\s+= user\.mfa/)
    expect(ler('src/lib/auth.config.ts')).toMatch(/session\.user\.mfa/)
  })
})

describe('gates do modo required', () => {
  it('o proxy confere o claim antes de checar a permissão da rota', () => {
    const t = semComentarios(ler('src/proxy.ts'))
    expect(t.indexOf('mfaExigeCadastro')).toBeGreaterThan(0)
    expect(t.indexOf('mfaExigeCadastro')).toBeLessThan(t.indexOf('isRouteAllowedForRole(pathname'))
    expect(t).toContain('/mfa/cadastro')
  })
  it('requirePermission aplica o gate às actions de plataforma', () => {
    expect(semComentarios(ler('src/server/auth/guards.ts'))).toMatch(/perm === 'platform\.admin' && mfaExigeCadastro/)
  })
  it('as actions do cadastro NÃO usam requirePermission (redirecionaria para si mesmas) mas só aceitam SUPER_ADMIN e pedem a senha', () => {
    const t = semComentarios(ler('src/app/mfa/cadastro/actions.ts'))
    expect(t).not.toContain('requirePermission')
    expect((t.match(/permissionError\(ctx, 'platform\.admin'\)/g) ?? []).length).toBe(2)
    expect(t).toContain('verifyPassword(')
    expect(t).toMatch(/BUMP_SESSION_VERSION/)
  })
  it('a página de cadastro confere o perfil por conta própria', () => {
    expect(semComentarios(ler('src/app/mfa/cadastro/page.tsx'))).toMatch(/role !== 'SUPER_ADMIN'/)
  })
})

describe('o segredo não vaza', () => {
  it('nenhum arquivo do MFA escreve segredo, código ou chave em log', () => {
    const arquivos = [
      ...readdirSync(join(raiz, 'src/lib/mfa')).map((f) => `src/lib/mfa/${f}`),
      'src/server/mfa/service.ts', 'src/app/mfa/cadastro/actions.ts', 'scripts/ops/reset-mfa.ts',
    ]
    for (const a of arquivos) {
      const t = semComentarios(ler(a))
      for (const m of t.matchAll(/\b(?:log|logger)\.(?:info|warn|error|debug)\(([^)]*)\)/g)) {
        expect(m[1], `${a}: ${m[0]}`).not.toMatch(/segredo|secret|totp|recover|codigo|code|key|chave/i)
      }
    }
  })
  it('nada do MFA é lido do ambiente com prefixo NEXT_PUBLIC', () => {
    for (const f of ['src/lib/mfa/crypto.ts', 'src/lib/mfa/config.ts']) expect(ler(f)).not.toContain('NEXT_PUBLIC')
  })
  it('o logger mascara totp, segredo e códigos de recuperação', () => {
    for (const k of ['totp', 'segredo', 'secret_enc', 'recoveryCodes', '*.totp', '*.segredo']) expect(REDACT_PATHS).toContain(k)
  })
  it('o filtro do Sentry remove chaves secretas do evento, em qualquer profundidade', () => {
    const ev = { extra: { totp: '123456', segredo: 'ABCDEF', nested: { secret_enc: 'v1.a.b.c', recoveryCodes: ['aaaaa-bbbbb'], ok: 'visível' } } } as never
    const limpo = JSON.stringify(limparEvento(ev))
    for (const proibido of ['123456', 'ABCDEF', 'v1.a.b.c', 'aaaaa-bbbbb']) expect(limpo).not.toContain(proibido)
    expect(limpo).toContain('visível')
  })
})

describe('banco e configuração', () => {
  it('a migration das tabelas novas liga o RLS e só cria tabelas (nada de alterar as existentes)', () => {
    const sql = ler('prisma/migrations/20261008100000_user_mfa/migration.sql')
    expect(sql).toMatch(/ALTER TABLE "user_mfa" ENABLE ROW LEVEL SECURITY/)
    expect(sql).toMatch(/ALTER TABLE "mfa_recovery_codes" ENABLE ROW LEVEL SECURITY/)
    expect(sql).not.toMatch(/DROP |TRUNCATE|DELETE FROM|ALTER TABLE "(?!user_mfa|mfa_recovery_codes)\w+" (?!ADD CONSTRAINT)/)
  })
  it('.env.example documenta as duas variáveis, com MFA_ENFORCE=off', () => {
    const e = ler('.env.example')
    expect(e).toMatch(/^MFA_ENCRYPTION_KEY=\s*$/m)
    expect(e).toMatch(/^MFA_ENFORCE=off$/m)
  })
  it('a chave de cifra nunca é um valor padrão no código', () => {
    expect(ler('src/lib/mfa/crypto.ts')).toMatch(/throw new MfaKeyError\('MFA_ENCRYPTION_KEY ausente\.'\)/)
  })
})

describe('mensagens do login', () => {
  it('traduz os dois códigos novos e não vaza nenhum outro', () => {
    expect(loginErrorMessage('CallbackRouteError', LOGIN_MFA_REQUIRED_CODE)).toBe(MFA_MESSAGES.required)
    expect(loginErrorMessage('CallbackRouteError', LOGIN_MFA_INVALID_CODE)).toBe(MFA_MESSAGES.invalid)
    expect(loginErrorMessage('CallbackRouteError', 'qualquer outra coisa')).not.toMatch(/qualquer/)
  })
})

describe('script de emergência reset-mfa', () => {
  const ENV = { DATABASE_URL: 'postgresql://u:p@db.exemplo.supabase.co:6543/postgres' }
  it('exige e-mail e o host certo do banco', () => {
    expect(lerEntradaResetMfa(['--email', 'a@b.co', '--confirm-host', 'db.exemplo.supabase.co'], ENV)).toEqual({ email: 'a@b.co' })
    expect(lerEntradaResetMfa(['--confirm-host', 'db.exemplo.supabase.co'], ENV).erro).toBeTruthy()
    expect(lerEntradaResetMfa(['--email', 'a@b.co'], ENV).erro).toBeTruthy()
    expect(lerEntradaResetMfa(['--email', 'a@b.co', '--confirm-host', 'outro.host'], ENV).erro).toMatch(/Nada foi feito/)
  })
  it('o script só atua em SUPER_ADMIN, derruba as sessões e usa o serviço', () => {
    const t = ler('scripts/ops/reset-mfa.ts')
    expect(t).toContain("user.role !== 'SUPER_ADMIN'")
    expect(t).toContain('session_version')
    expect(t).toContain('redefinirMfa')
  })
})
