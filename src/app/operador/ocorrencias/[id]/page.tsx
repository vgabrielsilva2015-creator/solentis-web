import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, User, CheckCircle2, History, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SEVERITY_LABEL, OCCURRENCE_STATUS_LABEL, OCCURRENCE_STATUS_COLOR } from '@/lib/labels'
import { resolverOcorrencia } from '../actions'
import { OccurrenceTimeline } from '@/components/occurrence-timeline'

export default async function OperadorOcorrenciaDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: params.id, tenant_id },
    include: {
      reporter: { select: { name: true } },
      responsible: { select: { name: true } },
      resolver: { select: { name: true } },
      collection_point: { select: { name: true } },
      photos: { select: { id: true }, take: 3 },
      comments: {
        include: {
          user: { select: { name: true, role: true } }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  })

  if (!occurrence) {
    notFound()
  }

  const getStatusColor = (s: string) => {
    return OCCURRENCE_STATUS_COLOR[s] || 'bg-muted/10 text-muted-foreground border-border/20'
  }

  const getStatusText = (s: string) => {
    return OCCURRENCE_STATUS_LABEL[s] || s
  }

  const getSeverityBadge = (s: string) => {
    return SEVERITY_LABEL[s] || s
  }

  return (
    <main className="px-6 py-8 max-w-4xl mx-auto space-y-6 pb-24">
      <Link 
        href="/operador/ocorrencias" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Ocorrências
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(occurrence.status)} uppercase tracking-wider`}>
              {getStatusText(occurrence.status)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">ID: {occurrence.id.slice(-6).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {occurrence.category || 'Ocorrência'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detalhes da Ocorrência</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{occurrence.description}</p>
            
            {occurrence.photos.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {occurrence.photos.map((photo, i) => (
                  <Link
                    key={photo.id}
                    href={`/api/occurrences/${occurrence.id}/photo?index=${i}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-soft border border-border bg-card px-2 py-1 rounded"
                  >
                    Ver foto {i + 1} anexada →
                  </Link>
                ))}
              </div>
            )}

            {occurrence.immediate_action && (
              <div className="mt-3 p-3 rounded-lg bg-amber-955/20 border border-amber-900/30">
                <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Ação Imediata Executada</span>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{occurrence.immediate_action}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Severidade</span>
                <span className="font-medium text-sm text-foreground">{getSeverityBadge(occurrence.severity)}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Local / Ponto</span>
                <span className="font-medium text-sm text-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {occurrence.collection_point?.name || 'Não especificado'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
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

            {/* Formulário de Resolução via Server Action */}
            {occurrence.status !== 'RESOLVED' && (
              <div className="mt-6 pt-6 border-t border-border">
                <form className="space-y-4" action={resolverOcorrencia}>
                  <input type="hidden" name="id" value={occurrence.id} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Adicionar Notas de Resolução</label>
                    <textarea 
                      name="notes"
                      className="w-full p-3 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-xs" 
                      rows={3} 
                      placeholder="Descreva o que foi feito para resolver o problema..."
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 cursor-pointer border-0">
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Resolvida
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Responsabilidade</h2>
            
            <div>
              <span className="block text-xs text-muted-foreground mb-1">Atribuído para</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {occurrence.responsible?.name?.charAt(0) || '?'}
                </div>
                <span className="font-medium text-sm text-foreground">{occurrence.responsible?.name || 'Não atribuído'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <span className="block text-xs text-muted-foreground mb-1">Prazo SLA</span>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className={occurrence.deadline < new Date() && occurrence.status !== 'RESOLVED' ? 'text-red-500 font-bold animate-pulse' : 'text-foreground'}>
                  {occurrence.deadline.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
