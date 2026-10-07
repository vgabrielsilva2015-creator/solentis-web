/**
 * Posse de referências por tenant (T-05).
 *
 * As FKs do banco são globais: `readings.collection_point_id` aceita o id de um
 * ponto de QUALQUER planta. Por isso, todo id que chega do cliente (formulário,
 * argumento de server action) e vai ser gravado como referência precisa ser
 * conferido contra o tenant da sessão antes da escrita.
 *
 * Uso nas actions que devolvem estado de formulário:
 *
 *   const erro = await checkOwnership(tenantId, [
 *     { model: 'collectionPoint', id: parsed.data.collection_point_id },
 *     { model: 'user', id: parsed.data.responsible_id, optional: true, where: { is_active: true } },
 *   ])
 *   if (erro) return { error: erro }
 *
 * Uso nas actions que lançam erro:
 *
 *   await assertOwned(tenantId, { model: 'shift', id: shiftId })
 *
 * O guardião `tenant-isolation.test.ts` exige que toda FK gravada a partir de
 * entrada do cliente passe por uma destas funções (ou por um findFirst/findUnique
 * com `id` + `tenant_id` antes da escrita).
 */
import { prisma } from '@/lib/prisma'
import { UserFacingError } from '@/lib/user-errors'

/** Modelos que podem ser referenciados a partir de entrada do cliente, com a mensagem padrão. */
export const OWNED_MODEL_MESSAGES = {
  collectionPoint:   'Ponto de coleta inválido ou não autorizado.',
  qualityParameter:  'Parâmetro inválido ou não autorizado.',
  analysisMethod:    'Método de análise inválido ou não autorizado.',
  equipment:         'Equipamento inválido ou não autorizado.',
  equipmentCategory: 'Categoria inválida ou não autorizada.',
  user:              'Usuário inválido ou não autorizado.',
  chemicalProduct:   'Produto inválido ou não autorizado.',
  shift:             'Turno inválido ou não autorizado.',
  shiftInstance:     'Turno inválido ou não autorizado.',
  occurrence:        'Ocorrência inválida ou não autorizada.',
} as const

export type OwnedModel = keyof typeof OWNED_MODEL_MESSAGES

export interface OwnershipRef {
  model: OwnedModel
  /** id recebido do cliente. Vazio/nulo só é aceito com `optional: true`. */
  id: string | null | undefined
  /** Campo opcional: id vazio é aceito (a FK será gravada como null). */
  optional?: boolean
  /** Filtros extras (ex.: `{ is_active: true }`, `{ role: 'OPERATOR' }`). */
  where?: Record<string, unknown>
  /** Mensagem própria; o padrão vem de OWNED_MODEL_MESSAGES. */
  message?: string
}

/** Cliente mínimo usado aqui (prisma ou o `tx` de uma transação). */
type FindFirst = (args: { where: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string } | null>
export type OwnershipDb = { [K in OwnedModel]: { findFirst: unknown } }

export class OwnershipError extends UserFacingError {
  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
  }
}

export function ownershipMessage(ref: Pick<OwnershipRef, 'model' | 'message'>): string {
  return ref.message ?? OWNED_MODEL_MESSAGES[ref.model]
}

async function isOwned(db: OwnershipDb, tenantId: string, ref: OwnershipRef): Promise<boolean> {
  if (ref.id == null || ref.id === '') return !!ref.optional
  if (typeof ref.id !== 'string') return false
  const findFirst = db[ref.model].findFirst as FindFirst
  const row = await findFirst({
    // tenant_id por último: nenhum filtro extra consegue sobrescrever o escopo
    where: { ...(ref.where ?? {}), id: ref.id, tenant_id: tenantId },
    select: { id: true },
  })
  return row !== null
}

/**
 * Confere todas as referências em paralelo. Devolve a mensagem do primeiro item
 * (na ordem informada) que não pertence ao tenant, ou `null` se todas pertencem.
 */
export async function checkOwnership(
  tenantId: string,
  refs: OwnershipRef[],
  db: OwnershipDb = prisma as unknown as OwnershipDb,
): Promise<string | null> {
  if (!tenantId) throw new Error('checkOwnership: tenantId ausente')
  const results = await Promise.all(refs.map((ref) => isOwned(db, tenantId, ref)))
  const idx = results.indexOf(false)
  return idx === -1 ? null : ownershipMessage(refs[idx])
}

/** Igual a `checkOwnership`, mas lança `OwnershipError` (mensagem segura para a tela). */
export async function assertOwned(
  tenantId: string,
  refs: OwnershipRef | OwnershipRef[],
  db: OwnershipDb = prisma as unknown as OwnershipDb,
): Promise<void> {
  const erro = await checkOwnership(tenantId, Array.isArray(refs) ? refs : [refs], db)
  if (erro) throw new OwnershipError(erro)
}
