import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { ResolveForm } from './resolve-form'
import { getTenantId } from '@/lib/tenant'
import { OccurrenceTimeline } from '@/components/occurrence-timeline'


const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-muted text-muted-foreground border-border',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')

  const { id } = await params

  const occurrence = await prisma.occurrence.findFirst({ where: { id, tenant_id: (await getTenantId()) },
    include: {
      reporter:    { select: { name: true } },
      resolver:    { select: { name: true } },
      responsible: { select: { name: true } },
      photos:      { select: { id: true }, take: 3 },
      comments: {
        include: {
          user: { select: { name: true, role: true } }
        },
        orderBy: { created_at: 'asc' }
      }
    },
  })

  if (!occurrence || occurrence.tenant_id !== (await getTenantId())) notFound()

  const now          = new Date()
  const prazoVencido = occurrence.status !== 'RESOLVED' && new Date(occurrence.deadline) < now
  const hasPhoto     = occurrence.photos.length > 0

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <BackButton href="/gestor/ocorrencias" label="Ocorrências" />
          <h1 className="text-xl font-semibold mt-1">Detalhes da Ocorrência</h1>
        </div>

        {/* Card da ocorrência */}
        <div className={[
          'rounded-xl border bg-card p-4 space-y-3',
          prazoVencido ? 'border-red-900/60' : 'border-border',
        ].join(' ')}>
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[occurrence.severity] ?? 'bg-muted text-muted-foreground border-border'}`}>
              {SEVERITY_LABEL[occurrence.severity] ?? occurrence.severity}
            </span>
            {prazoVencido && (
              <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                PRAZO VENCIDO
              </span>
            )}
            {occurrence.status === 'RESOLVED' && (
              <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                Resolvida
              </span>
            )}
            {occurrence.status === 'OPEN' && (
              <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                Aberta
              </span>
            )}
            {occurrence.status === 'IN_PROGRESS' && (
              <span className="rounded border border-sky-900/50 bg-sky-950/60 px-2 py-0.5 text-xs font-medium text-sky-400">
                Em andamento
              </span>
            )}
          </div>

          {/* Descrição */}
          <p className="text-sm text-foreground leading-relaxed">{occurrence.description}</p>

          {/* Metadados */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <dt className="text-muted-foreground">Registrado por</dt>
              <dd className="text-foreground">{occurrence.reporter.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data</dt>
              <dd className="text-foreground">{formatDatetime(occurrence.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Prazo</dt>
              <dd className={prazoVencido ? 'text-red-400 font-medium' : 'text-foreground'}>
                {formatDatetime(occurrence.deadline)}
              </dd>
            </div>
            {occurrence.responsible && (
              <div>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className="text-foreground">{occurrence.responsible.name}</dd>
              </div>
            )}
          </dl>

          {/* Fotos */}
          {hasPhoto && (
            <div className="pt-2 flex flex-wrap gap-2">
              {occurrence.photos.map((photo, i) => (
                <Link
                  key={photo.id}
                  href={`/api/occurrences/${occurrence.id}/photo?index=${i}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 border border-border bg-background px-2 py-1 rounded"
                >
                  Ver foto {i + 1} anexada →
                </Link>
              ))}
            </div>
          )}

          {/* Ação Imediata */}
          {occurrence.immediate_action && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 space-y-1">
              <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">Ação Imediata Executada</span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{occurrence.immediate_action}</p>
            </div>
          )}

          {/* Timeline e Comentários */}
          <div className="border-t border-border pt-4 mt-4">
            <OccurrenceTimeline
              occurrenceId={occurrence.id}
              reporterName={occurrence.reporter.name}
              createdAt={occurrence.created_at}
              status={occurrence.status}
              resolvedAt={occurrence.resolved_at}
              resolverName={occurrence.resolver?.name}
              resolutionNotes={occurrence.resolution_notes}
              comments={occurrence.comments}
            />
          </div>

          {/* Formulário de resolução (só se aberta) */}
          {occurrence.status !== 'RESOLVED' && (
            <div className="border-t border-border pt-4">
              <ResolveForm ocorrenciaId={occurrence.id} />
            </div>
          )}
        </div>
    </main>
  )
}
