/**
 * Super Admin — Fase 1 (base). Amarrações em arquivo; o comportamento no banco está em
 * src/server/__tests__/p0-superadmin-base.int.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const raiz = process.cwd()
const ler = (p: string) => readFileSync(join(raiz, p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function paginas(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) paginas(full, acc)
    else if (e === 'page.tsx') acc.push(full)
  }
  return acc
}

describe('/admin: cada página confere o perfil por conta própria (não só o layout)', () => {
  const todas = paginas(join(raiz, 'src/app/admin'))
  it('existem páginas no painel', () => expect(todas.length).toBeGreaterThanOrEqual(5))
  it.each(todas.map((f) => [f.replace(raiz + '/', ''), f]))('%s', (_n, f) => {
    const t = semComentarios(readFileSync(f as string, 'utf-8'))
    // Página de cliente (formulário) não lê sessão: a defesa é o layout + o guard da action que ela chama.
    if (/^\s*'use client'/.test(t)) {
      expect(t).toMatch(/from '\.\.\/actions'/)
      return
    }
    expect(t).toMatch(/role !== 'SUPER_ADMIN'|requirePermission\('platform\.admin'\)/)
  })
})

describe('gestor do cliente não alcança super admin', () => {
  it('toda busca/gravação de usuário por id nas actions do gestor exclui SUPER_ADMIN', () => {
    const t = semComentarios(ler('src/app/gestor/(sistema)/usuarios/actions.ts'))
    const alvos = t.match(/where:\s*\{\s*id:\s*userId,\s*tenant_id:\s*tenantId[^}]*\}/g) ?? []
    expect(alvos.length).toBeGreaterThanOrEqual(6)
    for (const a of alvos) expect(a, a).toMatch(/role:\s*\{\s*not:\s*'SUPER_ADMIN'\s*\}/)
  })
  it('a lista de usuários da planta não traz SUPER_ADMIN', () => {
    const t = semComentarios(ler('src/app/gestor/(sistema)/usuarios/page.tsx'))
    expect((t.match(/role:\s*\{\s*not:\s*'SUPER_ADMIN'\s*\}/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })
  it('o formulário do gestor nunca aceita SUPER_ADMIN como perfil', () => {
    expect(ler('src/app/gestor/(sistema)/usuarios/schema.ts')).not.toMatch(/enum\([^)]*SUPER_ADMIN/)
  })
})

describe('layout do painel e actions de criação', () => {
  it('o layout de /admin confere SUPER_ADMIN', () => {
    expect(semComentarios(ler('src/app/admin/layout.tsx'))).toMatch(/role !== 'SUPER_ADMIN'/)
  })
  it('criarPlanta exige o guard de plataforma', () => {
    const t = semComentarios(ler('src/app/admin/plantas/actions.ts'))
    const corpo = t.slice(t.indexOf('export async function criarPlanta'))
    expect(corpo.slice(0, 400)).toMatch(/requirePermission\('platform\.admin'\)/)
  })
})

describe('rotas e planta da plataforma', () => {
  it('o proxy não libera tudo para SUPER_ADMIN', () => {
    expect(semComentarios(ler('src/lib/auth-utils.ts'))).not.toMatch(/userRole === 'SUPER_ADMIN'\) return true/)
  })
  it('o slug da plataforma é reservado ao criar e ao editar planta', () => {
    const t = ler('src/app/admin/plantas/actions.ts')
    expect((t.match(/refine\(\(v\) => v !== PLATAFORMA_SLUG/g) ?? []).length).toBe(2)
  })
  it('toda função de escrita do serviço de plataforma audita', () => {
    const t = semComentarios(ler('src/server/admin/plataforma.ts'))
    // moverSuperAdmin, alternarAtivoUsuarioPlataforma e garantirPlantaPlataforma (criação da planta é coberta pela auditoria da mudança)
    expect((t.match(/logAudit\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(t).toMatch(/FOR UPDATE/)
  })
  it('as actions do painel que alteram planta/usuário usam o guard de plataforma', () => {
    const t = semComentarios(ler('src/app/admin/plantas/actions.ts'))
    const funcoes = t.match(/export async function \w+/g) ?? []
    const guards = t.match(/requirePermission\('platform\.admin'\)/g) ?? []
    expect(guards.length).toBeGreaterThanOrEqual(funcoes.length)
  })
  it('create-super-admin cria na plataforma por padrão e há script de mover com simulação', () => {
    expect(ler('scripts/ops/create-super-admin.ts')).toContain('garantirPlantaPlataforma')
    const m = ler('scripts/ops/move-super-admin.ts')
    expect(m).toContain('--apply')
    expect(m).toContain('--confirm-host')
  })
})

describe('auditoria registra o IP', () => {
  it('logAudit grava ip_address (informado ou da requisição)', () => {
    const t = semComentarios(ler('src/lib/audit.ts'))
    expect(t).toContain('ip_address')
    expect(t).toContain('ipDaRequisicao')
  })
})
