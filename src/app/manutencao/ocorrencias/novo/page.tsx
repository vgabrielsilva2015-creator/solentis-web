import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TecnicoOccurrenceForm } from '@/app/tecnico/ocorrencias/novo/occurrence-form'
import { requirePermission } from '@/server/auth/guards'

// T-20 (decisão 3): a Manutenção registra ocorrências — por exemplo, um
// vazamento encontrado durante a preventiva. Mesmo formulário e mesma action
// dos outros perfis.
export default async function NovaOcorrenciaManutencaoPage() {
  const ctx = await requirePermission('occurrence.create')

  const collectionPoints = await prisma.collectionPoint.findMany({
    where: { tenant_id: ctx.tenantId, is_active: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div>
        <BackButton href="/manutencao/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>
      <TecnicoOccurrenceForm collectionPoints={collectionPoints} redirectTo="/manutencao/ocorrencias" />
    </main>
  )
}
