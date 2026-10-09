/** Fábricas de dados para os testes de integração (T-28). Cada uma devolve a linha criada. */
import { prisma } from '@/lib/prisma'

let n = 0
const seq = () => ++n
/** Hash bcrypt fixo de "Teste@1234" (custo 4: rápido; os testes de integração não medem o custo). */
export const SENHA_TESTE = 'Teste@1234'
export const HASH_TESTE = '$2b$04$.YS.Hw2Ea/qwjV4d6NJDBe/SVEZpaAPSD2D7oaNPMYJApAv8iYCSO'

export async function criarPlanta(over: { name?: string; slug?: string; is_active?: boolean } = {}) {
  const i = seq()
  return prisma.tenant.create({ data: { name: over.name ?? `Planta ${i}`, slug: over.slug ?? `planta-${i}`, is_active: over.is_active ?? true } })
}

export async function criarUsuario(tenant_id: string, role: string, over: { email?: string; is_active?: boolean; name?: string } = {}) {
  const i = seq()
  return prisma.user.create({
    data: {
      tenant_id, role, name: over.name ?? `Usuário ${i}`,
      email: over.email ?? `u${i}@teste.local`,
      password_hash: HASH_TESTE, must_change_password: false, is_active: over.is_active ?? true,
    },
  })
}

export async function criarPonto(tenant_id: string, name?: string) {
  return prisma.collectionPoint.create({ data: { tenant_id, name: name ?? `Ponto ${seq()}` } })
}

export async function criarCategoria(tenant_id: string, name?: string) {
  return prisma.equipmentCategory.create({ data: { tenant_id, name: name ?? `Categoria ${seq()}` } })
}

export async function criarProduto(tenant_id: string, created_by: string, over: { name?: string; unit?: string; min_stock?: number } = {}) {
  return prisma.chemicalProduct.create({
    data: { tenant_id, created_by, name: over.name ?? `Produto ${seq()}`, unit: over.unit ?? 'kg', min_stock: over.min_stock ?? 0 },
  })
}

export async function criarEntrada(tenant_id: string, product_id: string, recorded_by: string, quantity: number) {
  return prisma.chemicalStockEntry.create({ data: { tenant_id, product_id, recorded_by, quantity, received_at: new Date() } })
}

/** Uma planta completa com um usuário de cada perfil usado nos testes. */
export async function criarCenario(rotulo = 'A') {
  const tenant = await criarPlanta({ name: `Planta ${rotulo}`, slug: `planta-${rotulo.toLowerCase()}-${seq()}` })
  const [gestor, operador, tecnico] = await Promise.all([
    criarUsuario(tenant.id, 'MANAGER'), criarUsuario(tenant.id, 'OPERATOR'), criarUsuario(tenant.id, 'TECHNICIAN'),
  ])
  const ponto = await criarPonto(tenant.id)
  const produto = await criarProduto(tenant.id, gestor.id)
  return { tenant, gestor, operador, tecnico, ponto, produto }
}
