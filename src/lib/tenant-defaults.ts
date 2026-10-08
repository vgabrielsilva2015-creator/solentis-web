import { Prisma } from '@prisma/client'

/**
 * Conjunto "de fábrica" de uma planta (tenant). Popula os cadastros de referência
 * que toda ETE precisa para operar: parâmetros CONAMA (+ limites), métodos, categorias
 * de equipamento, pontos de coleta, turnos, prazos de ocorrência e produtos químicos.
 *
 * É o mesmo conteúdo do `prisma/seed.ts`, mas parametrizado por `tenantId` (sem os IDs
 * fixos `seed-*`) para poder rodar em QUALQUER planta — chamado na criação de planta
 * (criarPlanta) e pelo script de backfill (scripts/ops/seed-tenant.ts).
 *
 * Idempotente: cada bloco só é criado se a planta ainda não tiver aquele tipo de
 * cadastro (count === 0), então rodar duas vezes não duplica.
 *
 * `createdBy` precisa ser o id de um usuário DA MESMA planta (alguns campos
 * created_by/updated_by são obrigatórios).
 */
export async function seedTenantDefaults(
  tx: Prisma.TransactionClient,
  tenantId: string,
  createdBy: string,
): Promise<void> {
  const legalRef = 'CONAMA 430/2011 Art. 16'
  const effectiveDate = new Date('2025-01-01T00:00:00.000Z')

  // ── Parâmetros CONAMA (+ limite legal EFLUENTE de cada um) ──────────────────
  if ((await tx.qualityParameter.count({ where: { tenant_id: tenantId } })) === 0) {
    const params = [
      { name: 'pH',                         unit: 'adimensional', min_limit: 5.0,  max_limit: 9.0    },
      { name: 'DBO5',                       unit: 'mg/L',         min_limit: null, max_limit: 60.0   },
      { name: 'DQO',                        unit: 'mg/L',         min_limit: null, max_limit: 200.0  },
      { name: 'Nitrogenio Amoniacal',       unit: 'mg/L',         min_limit: null, max_limit: 20.0   },
      { name: 'Fosforo Total',              unit: 'mg/L',         min_limit: null, max_limit: 1.0    },
      { name: 'Solidos Suspensos',          unit: 'mg/L',         min_limit: null, max_limit: 100.0  },
      { name: 'Coliformes Termotolerantes', unit: 'NMP/100mL',    min_limit: null, max_limit: 1000.0 },
      { name: 'Turbidez',                   unit: 'NTU',          min_limit: null, max_limit: 100.0  },
    ]
    // Em lote (poucos round-trips): cria os parâmetros, relê os ids e cria os limites.
    await tx.qualityParameter.createMany({
      data: params.map((p) => ({
        tenant_id: tenantId,
        name: p.name,
        unit: p.unit,
        min_limit: p.min_limit,
        max_limit: p.max_limit,
        legal_reference: legalRef,
        effective_date: effectiveDate,
        is_active: true,
        created_by: createdBy,
      })),
    })
    const criados = await tx.qualityParameter.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true },
    })
    const idPorNome = new Map(criados.map((c) => [c.name, c.id]))
    await tx.parameterLimit.createMany({
      data: params.map((p) => ({
        tenant_id: tenantId,
        parameter_id: idPorNome.get(p.name)!,
        matrix: 'EFLUENTE',
        min_limit: p.min_limit,
        max_limit: p.max_limit,
        legal_reference: legalRef,
        rule_type: p.min_limit !== null && p.max_limit !== null ? 'FAIXA' : 'TETO',
      })),
    })
  }

  // ── Métodos de análise ──────────────────────────────────────────────────────
  if ((await tx.analysisMethod.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.analysisMethod.createMany({
      data: [
        { tenant_id: tenantId, name: 'Colorimetria', description: 'Metodo colorimetrico para determinacao de compostos em solucao', is_active: true },
        { tenant_id: tenantId, name: 'Gravimetria',  description: 'Metodo gravimetrico para determinacao de solidos e residuos',   is_active: true },
        { tenant_id: tenantId, name: 'Titulacao',    description: 'Metodo volumetrico por titulacao para alcalinidade e dureza',    is_active: true },
      ],
    })
  }

  // ── Categorias de equipamento ───────────────────────────────────────────────
  if ((await tx.equipmentCategory.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.equipmentCategory.createMany({
      data: [
        { tenant_id: tenantId, name: 'Bombas',           description: 'Bombas de recalque e submersas', is_active: true },
        { tenant_id: tenantId, name: 'Aeradores',        description: 'Aeradores superficiais e difusores', is_active: true },
        { tenant_id: tenantId, name: 'Filtros',          description: 'Filtros de areia, carvao ativado e membranas', is_active: true },
        { tenant_id: tenantId, name: 'Medidores',        description: 'Medidores de vazao, pH, OD e turbidez', is_active: true },
        { tenant_id: tenantId, name: 'Dosadores',        description: 'Bombas dosadoras de cloro, coagulante e floculante', is_active: true },
        { tenant_id: tenantId, name: 'Estruturas Civis', description: 'Tanques, calhas e decantadores', is_active: true },
      ],
    })
  }

  // ── Pontos de coleta ────────────────────────────────────────────────────────
  if ((await tx.collectionPoint.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.collectionPoint.createMany({
      data: [
        { tenant_id: tenantId, name: 'Entrada ETE',      matrix: 'EFLUENTE',    location: 'Calha Parshall - entrada',      description: 'Efluente bruto antes de qualquer tratamento', is_active: true, is_field: true,  is_internal: true,  is_external: true  },
        { tenant_id: tenantId, name: 'Reator Biologico', matrix: 'EFLUENTE',    location: 'Tanque de aeracao - saida',     description: 'Efluente apos tratamento biologico aerobio',   is_active: true, is_field: true,  is_internal: true,  is_external: false },
        { tenant_id: tenantId, name: 'Saida Final',      matrix: 'EFLUENTE',    location: 'Calha de saida - apos filtros', description: 'Efluente tratado lancado no corpo receptor',   is_active: true, is_field: true,  is_internal: true,  is_external: true  },
        { tenant_id: tenantId, name: 'Poço de Monitoramento 1', matrix: 'SUBTERRANEA', location: 'Montante', description: 'Água subterrânea', is_active: true, is_field: false, is_internal: false, is_external: true },
      ],
    })
  }

  // ── Turnos (Manha, Tarde, Noite) ────────────────────────────────────────────
  if ((await tx.shift.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.shift.createMany({
      data: [
        { tenant_id: tenantId, name: 'Manha', start_time: '06:00', end_time: '14:00', crosses_midnight: false, handover_timeout_minutes: 120, is_active: true },
        { tenant_id: tenantId, name: 'Tarde', start_time: '14:00', end_time: '22:00', crosses_midnight: false, handover_timeout_minutes: 120, is_active: true },
        { tenant_id: tenantId, name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true,  handover_timeout_minutes: 120, is_active: true },
      ],
    })
  }

  // ── Prazos padrão de ocorrência (necessário p/ o app calcular deadline) ─────
  if ((await tx.occurrenceSeverityDefault.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.occurrenceSeverityDefault.createMany({
      data: [
        { tenant_id: tenantId, severity: 'CRITICAL', deadline_hours: 24,  updated_by: createdBy },
        { tenant_id: tenantId, severity: 'HIGH',     deadline_hours: 72,  updated_by: createdBy },
        { tenant_id: tenantId, severity: 'MEDIUM',   deadline_hours: 168, updated_by: createdBy },
        { tenant_id: tenantId, severity: 'LOW',      deadline_hours: 720, updated_by: createdBy },
      ],
    })
  }

  // ── Produtos químicos ───────────────────────────────────────────────────────
  if ((await tx.chemicalProduct.count({ where: { tenant_id: tenantId } })) === 0) {
    await tx.chemicalProduct.createMany({
      data: [
        { tenant_id: tenantId, name: 'Cloro Granulado',      unit: 'kg',   min_stock: 20,  description: 'Hipoclorito de calcio granulado 65% - desinfeccao', is_active: true, created_by: createdBy },
        { tenant_id: tenantId, name: 'Hipoclorito de Sodio', unit: 'L',    min_stock: 50,  description: 'Solucao 12% - desinfeccao do efluente final',       is_active: true, created_by: createdBy },
        { tenant_id: tenantId, name: 'Cal Hidratada',        unit: 'saco', min_stock: 5,   description: 'Saco 20 kg - correcao de pH e precipitacao de fosforo', is_active: true, created_by: createdBy },
        { tenant_id: tenantId, name: 'Sulfato de Aluminio',  unit: 'kg',   min_stock: 100, description: 'Coagulante primario para remocao de turbidez e SST', is_active: true, created_by: createdBy },
        { tenant_id: tenantId, name: 'Polimero Cationico',   unit: 'kg',   min_stock: 10,  description: 'Floculante auxiliar para desaguamento do lodo',      is_active: true, created_by: createdBy },
      ],
    })
  }
}
