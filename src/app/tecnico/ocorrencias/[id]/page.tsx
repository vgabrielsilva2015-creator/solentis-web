import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ResolveForm } from './resolve-form'

const TENANT_ID = 'default'

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
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
  if (!session) redirect('/login')

  const { id } = await params

  const occurrence = await prisma.occurrence.findUnique({
    where:   { id },
    include: {
      reporter:    { select: { name: true } },
      resolver:    { select: { name: true } },
      responsible: { select: { name: true } },
      photos:      { select: { id: true }, take: 1 },
    },
  })

  if (!occurrence || occurrence.tenant_id !== TENANT_ID) notFound()

  const now          = new Date()
  const prazoVencido = occurrence.status !== 'RESOLVED' && new Date(occurrence.deadline) < now
  const hasPhoto     = occurrence.photos.length > 0

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/tecnico/ocorrencias" className="text-sm text-slate-400 hover:text-slate-200">
            ← Ocorrências
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-base font-semibold truncate">Detalhe</h1>
        </div>

        {/* Card da ocorrência */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          prazoVencido ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[occurrence.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
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
          <p className="text-sm text-slate-200 leading-relaxed">{occurrence.description}</p>

          {/* Metadados */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <dt className="text-slate-500">Registrado por</dt>
              <dd className="text-slate-300">{occurrence.reporter.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Data</dt>
              <dd className="text-slate-300">{formatDatetime(occurrence.created_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Prazo</dt>
              <dd className={prazoVencido ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {formatDatetime(occurrence.deadline)}
              </dd>
            </div>
            {occurrence.responsible && (
              <div>
                <dt className="text-slate-500">Responsável</dt>
                <dd className="text-slate-300">{occurrence.responsible.name}</dd>
              </div>
            )}
          </dl>

          {/* Foto */}
          {hasPhoto && (
            <div className="pt-1">
              <Link
                href={`/api/occurrences/${occurrence.id}/photo`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
              >
                Ver foto anexada →
              </Link>
            </div>
          )}

          {/* Resolução (se encerrada) */}
          {occurrence.status === 'RESOLVED' && (
            <div className="rounded-md border border-green-900/40 bg-green-950/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-green-400">Resolução</p>
              <p className="text-sm text-slate-300">{occurrence.resolution_notes ?? '—'}</p>
              <p className="text-xs text-slate-600">
                Por {occurrence.resolver?.name ?? '—'} em {occurrence.resolved_at ? formatDatetime(occurrence.resolved_at) : '—'}
              </p>
            </div>
          )}

          {/* Formulário de resolução (só se aberta) */}
          {occurrence.status !== 'RESOLVED' && (
            <ResolveForm ocorrenciaId={occurrence.id} />
          )}
        </div>
    </main>
  )
}
