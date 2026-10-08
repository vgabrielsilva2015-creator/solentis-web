import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { requirePermission } from '@/server/auth/guards'

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: 'Aberta',       cls: 'bg-red-950/60 text-red-400 border-red-900/50' },
  IN_PROGRESS: { label: 'Em andamento', cls: 'bg-amber-950/60 text-amber-400 border-amber-900/50' },
  WAITING:     { label: 'Aguardando',   cls: 'bg-purple-950/60 text-purple-400 border-purple-900/50' },
  RESOLVED:    { label: 'Resolvida',    cls: 'bg-green-950/60 text-green-400 border-green-900/50' },
}
const SEVERIDADE: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' }

// T-20 (decisão 3): ocorrências registradas por quem está logado na Manutenção,
// com o andamento e quem resolveu.
export default async function OcorrenciasManutencaoPage() {
  const ctx = await requirePermission('occurrence.create')

  const ocorrencias = await prisma.occurrence.findMany({
    where: { tenant_id: ctx.tenantId, reported_by: ctx.userId },
    orderBy: { created_at: 'desc' },
    take: 50,
    select: {
      id: true, description: true, severity: true, status: true, created_at: true,
      resolved_at: true, resolution_notes: true,
      resolver: { select: { name: true } },
      collection_point: { select: { name: true } },
    },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Minhas ocorrências</h1>
        <Link href="/manutencao/ocorrencias/novo">
          <Button className="h-9 bg-primary text-primary-foreground text-xs">+ Nova ocorrência</Button>
        </Link>
      </div>

      {ocorrencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não registrou ocorrências.</p>
      ) : (
        <ul className="space-y-2">
          {ocorrencias.map((o) => {
            const st = STATUS[o.status] ?? { label: o.status, cls: 'bg-muted text-muted-foreground border-border' }
            return (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground line-clamp-2">{o.description}</p>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.created_at.toLocaleString('pt-BR')} · Severidade {SEVERIDADE[o.severity] ?? o.severity}
                  {o.collection_point ? ` · ${o.collection_point.name}` : ''}
                </p>
                {o.status === 'RESOLVED' && (
                  <p className="text-xs text-green-400/90">
                    Resolvida por {o.resolver?.name ?? '—'} em {o.resolved_at?.toLocaleString('pt-BR') ?? '—'}
                    {o.resolution_notes ? `: ${o.resolution_notes}` : ''}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
