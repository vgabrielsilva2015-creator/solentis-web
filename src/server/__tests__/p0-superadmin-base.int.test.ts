/**
 * Super Admin — Fase 1 (base): conta de plataforma fora do alcance dos clientes, planta da
 * plataforma, "sempre sobra um super admin ativo". Banco real; só a sessão é simulada.
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs, form, redirecionou } from '@/test/auth-mock'
import { criarPlanta, criarUsuario, HASH_TESTE } from '@/test/factories'
import { resetarSenha, toggleAtivo, editarUsuario } from '@/app/gestor/(sistema)/usuarios/actions'
import { toggleAtivoPlanta, editarPlanta, criarUsuarioPlanta, toggleAtivoUsuario } from '@/app/admin/plantas/actions'
import { PLATAFORMA_SLUG, alternarAtivoUsuarioPlataforma, moverSuperAdmin, plantasDeClientes } from '@/server/admin/plataforma'
import { logAudit } from '@/lib/audit'

async function cenarioClienteComSuper() {
  const cliente = await criarPlanta({ name: 'Cliente', slug: `cli-${Math.random().toString(36).slice(2, 8)}` })
  const gestor = await criarUsuario(cliente.id, 'MANAGER')
  const comum = await criarUsuario(cliente.id, 'OPERATOR')
  const sup = await criarUsuario(cliente.id, 'SUPER_ADMIN', { email: `sup-${Math.random().toString(36).slice(2, 8)}@teste.local` })
  return { cliente, gestor, comum, sup }
}

describe('Gestor do cliente não alcança a conta de super admin (mesmo na mesma planta)', () => {
  it('resetar senha, desativar e editar o super admin: "não encontrado", nada muda', async () => {
    const { gestor, sup } = await cenarioClienteComSuper()
    actAs(gestor)
    expect(await resetarSenha(sup.id)).toEqual({ error: 'Usuário não encontrado.' })
    expect(await toggleAtivo(sup.id)).toEqual({ error: 'Usuário não encontrado.' })
    const r = await editarUsuario(sup.id, {}, form({ name: 'Hack', email: 'hack@teste.local', role: 'MANAGER' }))
    expect(r).toEqual({ error: 'Usuário não encontrado.' })
    const depois = await prisma.user.findUniqueOrThrow({ where: { id: sup.id } })
    expect(depois).toMatchObject({ password_hash: HASH_TESTE, is_active: true, email: sup.email, role: 'SUPER_ADMIN', session_version: sup.session_version })
  })

  it('controle: as mesmas ações funcionam num usuário comum da planta', async () => {
    const { gestor, comum } = await cenarioClienteComSuper()
    actAs(gestor)
    expect(await toggleAtivo(comum.id)).toEqual({})
    expect((await prisma.user.findUniqueOrThrow({ where: { id: comum.id } })).is_active).toBe(false)
    const r = await resetarSenha(comum.id)
    expect(r.tempPassword).toBeTruthy()
  })

  it('controle: editar usuário comum chega ao fim (redireciona)', async () => {
    const { gestor, comum } = await cenarioClienteComSuper()
    actAs(gestor)
    const url = await redirecionou(() => editarUsuario(comum.id, {}, form({ name: 'Novo Nome', email: comum.email, role: 'OPERATOR' })))
    expect(url).toBe('/gestor/usuarios')
  })
})

describe('planta da plataforma', () => {
  it('moverSuperAdmin: simulação não altera nada; aplicar move, derruba a sessão e audita; repetir é idempotente', async () => {
    const { sup, cliente } = await cenarioClienteComSuper()

    const seco = await moverSuperAdmin(prisma, { email: sup.email, apply: false })
    expect(seco.aplicado).toBe(false)
    expect(seco.plano).toMatchObject({ ok: true, jaNaPlataforma: false, deTenantId: cliente.id })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: sup.id } })).tenant_id).toBe(cliente.id)
    expect(await prisma.tenant.count({ where: { slug: PLATAFORMA_SLUG } })).toBe(0)

    const feito = await moverSuperAdmin(prisma, { email: sup.email, apply: true })
    expect(feito.aplicado).toBe(true)
    const plataforma = await prisma.tenant.findUniqueOrThrow({ where: { slug: PLATAFORMA_SLUG } })
    const depois = await prisma.user.findUniqueOrThrow({ where: { id: sup.id } })
    expect(depois.tenant_id).toBe(plataforma.id)
    expect(depois.session_version).toBe(sup.session_version + 1)
    expect(await prisma.auditLog.count({ where: { user_id: sup.id, tenant_id: plataforma.id, table_name: 'users' } })).toBe(1)

    const de_novo = await moverSuperAdmin(prisma, { email: sup.email, apply: true })
    expect(de_novo).toMatchObject({ aplicado: false, plano: { ok: true, jaNaPlataforma: true } })
    expect(await prisma.tenant.count({ where: { slug: PLATAFORMA_SLUG } })).toBe(1)
    expect(await prisma.auditLog.count({ where: { user_id: sup.id, table_name: 'users' } })).toBe(1)
  })

  it('recusa quem não é SUPER_ADMIN e e-mail inexistente; nada muda', async () => {
    const { gestor } = await cenarioClienteComSuper()
    expect((await moverSuperAdmin(prisma, { email: gestor.email, apply: true })).plano).toMatchObject({ ok: false })
    expect((await moverSuperAdmin(prisma, { email: 'ninguem@teste.local', apply: true })).plano).toMatchObject({ ok: false })
    expect(await prisma.tenant.count({ where: { slug: PLATAFORMA_SLUG } })).toBe(0)
  })

  it('a lista de plantas dos clientes não traz a plataforma', async () => {
    const { sup, cliente } = await cenarioClienteComSuper()
    await moverSuperAdmin(prisma, { email: sup.email, apply: true })
    const lista = await plantasDeClientes(prisma)
    expect(lista.map((t) => t.id)).toEqual([cliente.id])
  })

  it('o painel não desativa, não edita, não renomeia para o slug reservado e não cria usuário comum na plataforma', async () => {
    const { sup } = await cenarioClienteComSuper()
    await moverSuperAdmin(prisma, { email: sup.email, apply: true })
    const outro = await criarPlanta({ slug: 'outra-planta' })
    const plataforma = await prisma.tenant.findUniqueOrThrow({ where: { slug: PLATAFORMA_SLUG } })
    actAs({ ...sup, tenant_id: plataforma.id, role: 'SUPER_ADMIN' })

    // de dentro da própria plataforma vale a trava "própria planta"; de fora (super admin vindo de outra planta) vale a da plataforma
    expect(await toggleAtivoPlanta(plataforma.id)).toEqual({ error: 'Você não pode desativar a sua própria planta.' })
    const visitante = await criarUsuario(outro.id, 'SUPER_ADMIN')
    actAs(visitante)
    expect(await toggleAtivoPlanta(plataforma.id)).toEqual({ error: 'A planta da plataforma não pode ser desativada.' })
    actAs({ ...sup, tenant_id: plataforma.id, role: 'SUPER_ADMIN' })
    expect(await editarPlanta(plataforma.id, {}, form({ name: 'Nome Qualquer', slug: 'x-x' }))).toEqual({ error: 'A planta da plataforma não pode ser editada.' })
    const r = await editarPlanta(outro.id, {}, form({ name: 'Outra', slug: PLATAFORMA_SLUG }))
    expect(r.fieldErrors?.slug?.[0]).toMatch(/reservado/)
    expect(await criarUsuarioPlanta(plataforma.id, {}, form({ name: 'Zé', email: 'ze@teste.local', role: 'MANAGER' })))
      .toEqual({ error: 'A planta da plataforma só recebe usuários pelo script de super admin.' })

    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: plataforma.id } }))).toMatchObject({ is_active: true, slug: PLATAFORMA_SLUG })
    expect(await prisma.tenant.findUniqueOrThrow({ where: { id: outro.id } })).toMatchObject({ slug: 'outra-planta' })
  })
})

describe('sempre sobra um super admin ativo', () => {
  async function dois() {
    const p = await criarPlanta({ slug: `plat-${Math.random().toString(36).slice(2, 8)}` })
    const a = await criarUsuario(p.id, 'SUPER_ADMIN'); const b = await criarUsuario(p.id, 'SUPER_ADMIN')
    return { a, b, p }
  }
  const ativos = () => prisma.user.count({ where: { role: 'SUPER_ADMIN', is_active: true } })

  it('um admin desativa o outro (sobra quem agiu); a própria conta não', async () => {
    const { a, b } = await dois()
    expect(await alternarAtivoUsuarioPlataforma(prisma, { actorId: a.id, userId: a.id })).toEqual({ error: 'Você não pode desativar a sua própria conta.' })
    expect(await alternarAtivoUsuarioPlataforma(prisma, { actorId: a.id, userId: b.id })).toMatchObject({ isActive: false })
    expect(await ativos()).toBe(1)
  })

  it('o último admin ativo não pode ser desativado, nem por outra pessoa', async () => {
    const p = await criarPlanta({ slug: 'solo' })
    const solo = await criarUsuario(p.id, 'SUPER_ADMIN')
    const gestor = await criarUsuario(p.id, 'MANAGER')
    expect(await alternarAtivoUsuarioPlataforma(prisma, { actorId: gestor.id, userId: solo.id })).toEqual({ error: 'Precisa existir ao menos um super admin ativo.' })
    expect(await ativos()).toBe(1)
  })

  it('dois admins se desativando AO MESMO TEMPO: só um consegue, sobra um ativo (5 rodadas)', async () => {
    for (let i = 0; i < 5; i++) {
      // rodadas anteriores deixam um admin ativo cada: desativa os antigos para medir só esta
      await prisma.user.updateMany({ where: { role: 'SUPER_ADMIN' }, data: { is_active: false } })
      const { a, b } = await dois()
      const antes = await ativos()
      expect(antes).toBe(2)
      const [r1, r2] = await Promise.all([
        alternarAtivoUsuarioPlataforma(prisma, { actorId: a.id, userId: b.id }),
        alternarAtivoUsuarioPlataforma(prisma, { actorId: b.id, userId: a.id }),
      ])
      const ok = [r1, r2].filter((r) => r.isActive === false).length
      expect(ok, `rodada ${i}`).toBe(1)
      expect([r1, r2].filter((r) => r.error).length).toBe(1)
      expect(await ativos()).toBe(antes - 1)
    }
  })

  it('controle negativo: a mesma regra SEM a trava deixa os dois se desativarem (por isso a trava existe)', async () => {
    const { a, b } = await dois()
    const semTrava = (actor: string, alvo: string) => prisma.$transaction(async (tx) => {
      const outros = await tx.user.count({ where: { role: 'SUPER_ADMIN', is_active: true, id: { not: alvo } } })
      await new Promise((r) => setTimeout(r, 150)) // deixa as duas transações lerem antes de gravar
      if (outros < 1) return 'recusado'
      await tx.user.update({ where: { id: alvo }, data: { is_active: false } })
      return actor === alvo ? 'x' : 'ok'
    })
    const r = await Promise.all([semTrava(a.id, b.id), semTrava(b.id, a.id)])
    expect(r).toEqual(['ok', 'ok'])
    expect(await ativos()).toBe(0) // o estrago que a trava evita
  })

  it('pela action do painel: reativar um usuário comum continua funcionando', async () => {
    const { a } = await dois()
    const cliente = await criarPlanta({ slug: 'cliente-x' }); const u = await criarUsuario(cliente.id, 'OPERATOR', { is_active: false })
    actAs(a)
    expect(await toggleAtivoUsuario(u.id)).toEqual({ isActive: true })
  })
})

describe('auditoria guarda o IP', () => {
  it('IP informado vai para a coluna; fora de uma requisição fica nulo', async () => {
    const p = await criarPlanta({ slug: 'aud' }); const u = await criarUsuario(p.id, 'MANAGER')
    const base = { tenantId: p.id, userId: u.id, action: 'UPDATE' as const, tableName: 'users', recordId: u.id }
    await logAudit(prisma, { ...base, ip: '203.0.113.7' })
    await logAudit(prisma, base)
    const ips = (await prisma.auditLog.findMany({ where: { tenant_id: p.id }, orderBy: { timestamp: 'asc' } })).map((l) => l.ip_address)
    expect(ips).toEqual(['203.0.113.7', null])
  })
})
