import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', name: 'Solentis', slug: 'solentis', is_active: true },
  })
  console.log(`Tenant: ${tenant.name}`)

  // ── Usuários (hashes em paralelo) ─────────────────────────────────────────
  const [adminHash, tecnicoHash, operadorHash] = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Tecnico@123'),
    hashPassword('Operador@123'),
  ])

  const admin = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'admin@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'admin@solentis.local',
      password_hash: adminHash,
      name: 'Administrador',
      role: 'MANAGER',
      must_change_password: true,
      is_active: true,
    },
  })
  console.log(`Usuario: ${admin.email} (${admin.role})`)

  const tecnico = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'tecnico@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'tecnico@solentis.local',
      password_hash: tecnicoHash,
      name: 'Tecnico Padrao',
      role: 'TECHNICIAN',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${tecnico.email} (${tecnico.role})`)

  const operador = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'operador@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'operador@solentis.local',
      password_hash: operadorHash,
      name: 'Operador Padrao',
      role: 'OPERATOR',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${operador.email} (${operador.role})`)

  // ── Parâmetros de qualidade CONAMA ────────────────────────────────────────
  const effectiveDate = new Date('2025-01-01T00:00:00.000Z')

  const qualityParams = [
    { id: 'seed-param-ph',          name: 'pH',                         unit: 'adimensional', min_limit: 5.0,  max_limit: 9.0   },
    { id: 'seed-param-dbo',         name: 'DBO5',                       unit: 'mg/L',         min_limit: null, max_limit: 60.0  },
    { id: 'seed-param-dqo',         name: 'DQO',                        unit: 'mg/L',         min_limit: null, max_limit: 200.0 },
    { id: 'seed-param-n-amoniacal', name: 'Nitrogenio Amoniacal',       unit: 'mg/L',         min_limit: null, max_limit: 20.0  },
    { id: 'seed-param-fosforo',     name: 'Fosforo Total',              unit: 'mg/L',         min_limit: null, max_limit: 1.0   },
    { id: 'seed-param-ss',          name: 'Solidos Suspensos',          unit: 'mg/L',         min_limit: null, max_limit: 100.0 },
    { id: 'seed-param-coliformes',  name: 'Coliformes Termotolerantes', unit: 'NMP/100mL',    min_limit: null, max_limit: 1000.0},
    { id: 'seed-param-turbidez',    name: 'Turbidez',                   unit: 'NTU',          min_limit: null, max_limit: 100.0 },
  ]

  for (const param of qualityParams) {
    await prisma.qualityParameter.upsert({
      where: { id: param.id },
      update: {},
      create: {
        id: param.id,
        tenant_id: 'default',
        name: param.name,
        unit: param.unit,
        min_limit: param.min_limit,
        max_limit: param.max_limit,
        legal_reference: 'CONAMA 430/2011 Art. 16',
        effective_date: effectiveDate,
        is_active: true,
        created_by: admin.id,
      },
    })
    
    // Criar o limite legal multi-matriz atrelado a esse parâmetro (EFLUENTE)
    await prisma.parameterLimit.upsert({
      where: { tenant_id_parameter_id_matrix_legal_reference: { tenant_id: 'default', parameter_id: param.id, matrix: 'EFLUENTE', legal_reference: 'CONAMA 430/2011 Art. 16' } },
      update: {},
      create: {
        tenant_id: 'default',
        parameter_id: param.id,
        matrix: 'EFLUENTE',
        min_limit: param.min_limit,
        max_limit: param.max_limit,
        legal_reference: 'CONAMA 430/2011 Art. 16',
        rule_type: param.min_limit !== null && param.max_limit !== null ? 'FAIXA' : 'TETO'
      }
    })
  }
  console.log(`Parametros CONAMA: ${qualityParams.length}`)

  // ── Métodos de análise ────────────────────────────────────────────────────
  const analysisMethods = [
    { id: 'seed-method-colorimetria', name: 'Colorimetria', description: 'Metodo colorimetrico para determinacao de compostos em solucao' },
    { id: 'seed-method-gravimetria',  name: 'Gravimetria',  description: 'Metodo gravimetrico para determinacao de solidos e residuos' },
    { id: 'seed-method-titulacao',    name: 'Titulacao',    description: 'Metodo volumetrico por titulacao para alcalinidade e dureza' },
  ]

  for (const method of analysisMethods) {
    await prisma.analysisMethod.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: method.name } },
      update: {},
      create: {
        id: method.id,
        tenant_id: 'default',
        name: method.name,
        description: method.description,
        is_active: true,
      },
    })
  }
  console.log(`Metodos de analise: ${analysisMethods.length}`)

  // ── Categorias de equipamento ─────────────────────────────────────────────
  const equipmentCategories = [
    { id: 'seed-cat-bombas',     name: 'Bombas',           description: 'Bombas de recalque e submersas' },
    { id: 'seed-cat-aeradores',  name: 'Aeradores',        description: 'Aeradores superficiais e difusores' },
    { id: 'seed-cat-filtros',    name: 'Filtros',          description: 'Filtros de areia, carvao ativado e membranas' },
    { id: 'seed-cat-medidores',  name: 'Medidores',        description: 'Medidores de vazao, pH, OD e turbidez' },
    { id: 'seed-cat-dosadores',  name: 'Dosadores',        description: 'Bombas dosadoras de cloro, coagulante e floculante' },
    { id: 'seed-cat-estruturas', name: 'Estruturas Civis', description: 'Tanques, calhas e decantadores' },
  ]

  for (const cat of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: cat.name } },
      update: {},
      create: {
        id: cat.id,
        tenant_id: 'default',
        name: cat.name,
        description: cat.description,
        is_active: true,
      },
    })
  }
  console.log(`Categorias de equipamento: ${equipmentCategories.length}`)

  // ── Pontos de coleta ──────────────────────────────────────────────────────
  const collectionPoints = [
    { id: 'seed-cp-entrada', name: 'Entrada ETE',      location: 'Calha Parshall - entrada',      description: 'Efluente bruto antes de qualquer tratamento', matrix: 'EFLUENTE' },
    { id: 'seed-cp-reator',  name: 'Reator Biologico', location: 'Tanque de aeracao - saida',     description: 'Efluente apos tratamento biologico aerobio', matrix: 'EFLUENTE' },
    { id: 'seed-cp-saida',   name: 'Saida Final',      location: 'Calha de saida - apos filtros', description: 'Efluente tratado lancado no corpo receptor', matrix: 'EFLUENTE' },
    { id: 'seed-cp-poco-1',  name: 'Poço de Monitoramento 1', location: 'Montante', description: 'Água subterrânea', matrix: 'SUBTERRANEA' },
  ]

  for (const cp of collectionPoints) {
    await prisma.collectionPoint.upsert({
      where: { id: cp.id },
      update: { matrix: cp.matrix },
      create: {
        id: cp.id,
        tenant_id: 'default',
        name: cp.name,
        matrix: cp.matrix,
        location: cp.location,
        description: cp.description,
        is_active: true,
      },
    })
  }
  console.log(`Pontos de coleta: ${collectionPoints.length}`)

  // ── Turnos ────────────────────────────────────────────────────────────────
  const shifts = [
    { id: 'seed-shift-manha', name: 'Manha', start_time: '06:00', end_time: '14:00', crosses_midnight: false },
    { id: 'seed-shift-tarde', name: 'Tarde', start_time: '14:00', end_time: '22:00', crosses_midnight: false },
    { id: 'seed-shift-noite', name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true  },
  ]

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: {
        id: shift.id,
        tenant_id: 'default',
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        crosses_midnight: shift.crosses_midnight,
        handover_timeout_minutes: 120,
        is_active: true,
      },
    })
  }
  console.log(`Turnos: ${shifts.length} (Manha, Tarde, Noite)`)

  // ── Prazos padrão de ocorrência (4 linhas fixas) ──────────────────────────
  const severityDefaults = [
    { severity: 'CRITICAL', deadline_hours: 24  },
    { severity: 'HIGH',     deadline_hours: 72  },
    { severity: 'MEDIUM',   deadline_hours: 168 },
    { severity: 'LOW',      deadline_hours: 720 },
  ]

  for (const sd of severityDefaults) {
    await prisma.occurrenceSeverityDefault.upsert({
      where: { severity: sd.severity },
      update: {},
      create: {
        severity: sd.severity,
        deadline_hours: sd.deadline_hours,
        updated_by: admin.id,
      },
    })
  }
  console.log(`Prazos de ocorrencia: CRITICAL=24h, HIGH=72h, MEDIUM=168h, LOW=720h`)

  // ── Produtos químicos ─────────────────────────────────────────────────────
  const chemicalProducts = [
    { id: 'seed-chem-cloro-gran',    name: 'Cloro Granulado',       unit: 'kg',   min_stock: 20,  description: 'Hipoclorito de calcio granulado 65% - desinfeccao' },
    { id: 'seed-chem-hipoclorito',   name: 'Hipoclorito de Sodio',  unit: 'L',    min_stock: 50,  description: 'Solucao 12% - desinfeccao do efluente final' },
    { id: 'seed-chem-cal',           name: 'Cal Hidratada',         unit: 'saco', min_stock: 5,   description: 'Saco 20 kg - correcao de pH e precipitacao de fosforo' },
    { id: 'seed-chem-sulfato-al',    name: 'Sulfato de Aluminio',   unit: 'kg',   min_stock: 100, description: 'Coagulante primario para remocao de turbidez e SST' },
    { id: 'seed-chem-polimero',      name: 'Polimero Cationico',    unit: 'kg',   min_stock: 10,  description: 'Floculante auxiliar para desaguamento do lodo' },
  ]

  for (const product of chemicalProducts) {
    await prisma.chemicalProduct.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        tenant_id: 'default',
        name: product.name,
        unit: product.unit,
        min_stock: product.min_stock,
        description: product.description,
        is_active: true,
        created_by: admin.id,
      },
    })
  }
  console.log(`Produtos quimicos: ${chemicalProducts.length}`)

  console.log('\nSeed concluido com sucesso.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
