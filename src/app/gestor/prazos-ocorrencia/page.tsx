import { prisma } from '@/lib/prisma'
import { PrazosForm } from './prazos-form'

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Crítica',  color: 'text-red-400' },
  HIGH:     { label: 'Alta',     color: 'text-orange-400' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400' },
  LOW:      { label: 'Baixa',    color: 'text-slate-400' },
}

export default async function PrazosOcorrenciaPage() {
  const prazos = await prisma.occurrenceSeverityDefault.findMany({
    orderBy: { deadline_hours: 'asc' },
  })

  const initialValues = Object.fromEntries(
    prazos.map((p) => [p.severity, p.deadline_hours]),
  ) as Record<string, number>

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Prazos de Ocorrência</h1>
        <p className="text-sm text-slate-400">
          Prazo máximo (em horas) para resolução de ocorrências por severidade.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
        <p className="text-xs text-slate-500">
          Os prazos são sugeridos automaticamente ao registrar uma ocorrência e podem ser editados pelo Técnico ou Gestor.
        </p>

        <PrazosForm initialValues={initialValues} severityLabels={SEVERITY_LABELS} />
      </div>
    </main>
  )
}
