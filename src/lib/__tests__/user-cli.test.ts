import { describe, it, expect } from 'vitest'
import { lerEntradaUsuario, validarSenhaUsuario, PERFIS_CRIAVEIS } from '@/lib/user-cli'

const ENV = { DATABASE_URL: 'postgresql://u:p@db.exemplo.supabase.co:6543/postgres', NEW_USER_PASSWORD: 'x' }
const BASE = ['--email', 'Op@Empresa.com', '--name', 'Operador', '--tenant-slug', 'solentis', '--confirm-host', 'db.exemplo.supabase.co']

describe('create-user', () => {
  it('perfil padrão é OPERATOR, e-mail é normalizado, senha só do ambiente', () => {
    const r = lerEntradaUsuario(BASE, ENV)
    expect(r.input).toMatchObject({ email: 'op@empresa.com', role: 'OPERATOR', tenantSlug: 'solentis', password: 'x' })
  })
  it('aceita os 4 perfis e recusa SUPER_ADMIN e perfil inventado', () => {
    for (const p of PERFIS_CRIAVEIS) expect(lerEntradaUsuario([...BASE, '--role', p.toLowerCase()], ENV).input?.role).toBe(p)
    expect(lerEntradaUsuario([...BASE, '--role', 'SUPER_ADMIN'], ENV).erro).toMatch(/create-super-admin/)
    expect(lerEntradaUsuario([...BASE, '--role', 'ROOT'], ENV).erro).toBeTruthy()
  })
  it('sem e-mail, nome, planta ou host confirmado: recusa', () => {
    for (const falta of ['--email', '--name', '--tenant-slug', '--confirm-host']) {
      const i = BASE.indexOf(falta)
      expect(lerEntradaUsuario([...BASE.slice(0, i), ...BASE.slice(i + 2)], ENV).erro).toBeTruthy()
    }
  })
  it('host confirmado diferente do DATABASE_URL: nada é feito', () => {
    const args = [...BASE.slice(0, -1), 'outro.host']
    expect(lerEntradaUsuario(args, ENV).erro).toMatch(/Nada foi feito/)
  })
  it('slug inválido e --create-tenant sem nome são recusados; com nome, é aceito', () => {
    expect(lerEntradaUsuario(BASE.map((a) => (a === 'solentis' ? 'Minha Planta!' : a)), ENV).erro).toBeTruthy()
    expect(lerEntradaUsuario([...BASE, '--create-tenant', ''], ENV).erro).toMatch(/nome da planta/)
    expect(lerEntradaUsuario([...BASE, '--create-tenant', 'Planta Norte'], ENV).input?.createTenantName).toBe('Planta Norte')
  })
  it.each([['curta1', 'mínimo'], ['somenteletras', 'número'], ['1234567890', 'letra'], ['Operador@123', 'padrão']])('senha %j', (senha, trecho) => {
    expect(validarSenhaUsuario(senha, 'x@y.co')).toMatch(new RegExp(trecho, 'i'))
  })
  it('senha com o e-mail dentro é recusada; senha boa passa', () => {
    expect(validarSenhaUsuario('maria2026troca', 'maria@a.com')).toMatch(/e-mail/)
    expect(validarSenhaUsuario('Temporaria2026', 'op@empresa.com')).toBeNull()
  })
})
