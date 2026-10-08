import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { lerEntrada, validarSenhaSuper, hostDoBanco } from '@/lib/super-admin-cli'

const ENV = { DATABASE_URL: 'postgresql://u:p@db.exemplo.supabase.co:6543/postgres' }
const ARGS = ['--email', 'Dono@Exemplo.com', '--name', 'Dono', '--tenant-slug', 'solentis', '--confirm-host', 'db.exemplo.supabase.co']

describe('create-super-admin', () => {
  it('o script antigo com senha fixa não existe mais', () => {
    expect(existsSync(join(process.cwd(), 'create-super.ts'))).toBe(false)
  })
  it('não tem valor padrão: sem e-mail, nome, planta ou host confirmado, recusa', () => {
    for (const falta of ['--email', '--name', '--confirm-host']) {
      const i = ARGS.indexOf(falta)
      const args = [...ARGS.slice(0, i), ...ARGS.slice(i + 2)]
      expect(lerEntrada(args, ENV).erro).toBeTruthy()
    }
  })
  it('sem --tenant-slug a conta vai para a planta da plataforma (padrão novo); com --tenant-slug usa o informado', () => {
    const i = ARGS.indexOf('--tenant-slug')
    const semSlug = lerEntrada([...ARGS.slice(0, i), ...ARGS.slice(i + 2)], ENV)
    expect(semSlug.input?.tenantSlug).toBe('solentis-plataforma')
    expect(lerEntrada(ARGS, ENV).input?.tenantSlug).toBe('solentis')
  })
  it('recusa quando o host confirmado não é o do DATABASE_URL (banco errado)', () => {
    const r = lerEntrada(['--email', 'a@b.co', '--name', 'Dono', '--tenant-slug', 's', '--confirm-host', 'outro.host'], ENV)
    expect(r.erro).toMatch(/Nada foi feito/)
  })
  it('aceita com host certo, normaliza o e-mail e lê a senha só do ambiente', () => {
    const r = lerEntrada(ARGS, { ...ENV, SUPER_ADMIN_PASSWORD: 'x' })
    expect(r.input).toMatchObject({ email: 'dono@exemplo.com', tenantSlug: 'solentis', password: 'x' })
    expect(JSON.stringify(ARGS)).not.toContain('x"')
  })
  it('recusa slug inválido (maiúsculas ou espaço)', () => {
    const args = ['--email', 'a@b.co', '--name', 'Dono', '--tenant-slug', 'Planta Errada', '--confirm-host', 'db.exemplo.supabase.co']
    expect(lerEntrada(args, ENV).erro).toMatch(/tenant-slug/)
  })
  it('--create-tenant passa o nome da planta adiante (banco vazio)', () => {
    const args = [...ARGS, '--create-tenant', 'Planta de Sistema']
    const r = lerEntrada(args, { ...ENV, SUPER_ADMIN_PASSWORD: 'x' })
    expect(r.input).toMatchObject({ createTenantName: 'Planta de Sistema' })
  })
  it('--create-tenant vazio é recusado', () => {
    const args = [...ARGS, '--create-tenant', '']
    expect(lerEntrada(args, ENV).erro).toMatch(/create-tenant/)
  })
  it('hostDoBanco devolve só o host (sem usuário nem senha)', () => {
    expect(hostDoBanco(ENV.DATABASE_URL)).toBe('db.exemplo.supabase.co')
    expect(hostDoBanco('lixo')).toBeNull()
  })
  it.each([
    ['curta1', 'mínimo'], ['Super@123', 'mínimo'], ['somenteletrasaquiok', 'número'],
    ['Admin@123Admin@123', null], // 18 chars, mas não é senha padrão exata
  ])('senha %j', (senha, esperado) => {
    const r = validarSenhaSuper(senha, 'dono@exemplo.com')
    if (esperado === null) expect(r).toBeNull()
    else expect(r).toMatch(new RegExp(esperado, 'i'))
  })
  it('recusa senha padrão conhecida mesmo longa o bastante e senha com o e-mail dentro', () => {
    expect(validarSenhaSuper('operador@123', 'x@y.co')).not.toBeNull()
    expect(validarSenhaSuper('donoexemplo-2026-Segura9', 'donoexemplo@a.com')).toMatch(/e-mail/)
  })
})
