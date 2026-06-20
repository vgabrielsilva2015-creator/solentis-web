import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, AlertTriangle, User, CheckCircle2, History, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SEVERITY_LABEL, OCCURRENCE_STATUS_LABEL, OCCURRENCE_STATUS_COLOR } from '@/lib/labels'

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
      photos: { select: { id: true }, take: 1 },
    }
  })

  if (!occurrence) {
    notFound()
  }

  const getStatusColor = (s: string) => {
    return OCCURRENCE_STATUS_COLOR[s] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
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
              <div className="pt-2">
                <Link
                  href={`/api/occurrences/${occurrence.id}/photo`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs text-brand hover:text-brand-soft"
                >
                  Ver foto anexada →
                </Link>
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Timeline de Resolução
            </h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-1 bg-primary text-primary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-surface-2 border border-border shadow-sm">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-foreground text-sm">Abertura</div>
                    <time className="font-mono text-xs text-muted-foreground">{occurrence.created_at.toLocaleString('pt-BR')}</time>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Por {occurrence.reporter?.name}
                  </div>
                </div>
              </div>

              {occurrence.status === 'RESOLVED' && occurrence.resolved_at && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface-1 bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-surface-2 border border-border shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-foreground text-sm">Resolvida</div>
                      <time className="font-mono text-xs text-muted-foreground">{occurrence.resolved_at.toLocaleString('pt-BR')}</time>
                    </div>
                    {occurrence.resolution_notes && (
                      <div className="text-sm text-foreground mt-2 p-3 bg-surface-1 rounded-md border border-border">
                        {occurrence.resolution_notes}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Por {occurrence.resolver?.name || 'Desconhecido'}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Note: Adicionamos um link placeholder/form que permitiria ao Operador resolver diretamente */}
            {occurrence.status !== 'RESOLVED' && (
              <div className="mt-6 pt-6 border-t border-border">
                <form className="space-y-4" action="/api/ocorrencias/resolver" method="POST">
                  <input type="hidden" name="id" value={occurrence.id} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adicionar Notas de Resolução</label>
                    <textarea 
                      name="notes"
                      className="w-full p-3 rounded-lg border border-border bg-surface-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" 
                      rows={3} 
                      placeholder="Descreva o que foi feito para resolver o problema..."
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2 opacity-50 cursor-not-allowed" title="Em breve">
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
