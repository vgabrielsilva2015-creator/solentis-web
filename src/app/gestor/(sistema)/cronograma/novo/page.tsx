import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createMonitoringSchedule } from './actions'

export default async function NovoCronogramaPage() {
  const tenant_id = await getTenantId()
  
  const [pontos, parametros] = await Promise.all([
    prisma.collectionPoint.findMany({ where: { tenant_id, is_active: true } }),
    prisma.qualityParameter.findMany({ where: { tenant_id, is_active: true } })
  ])

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Novo Agendamento</h1>
        <p className="text-sm text-muted-foreground">Configure a periodicidade de uma análise.</p>
      </div>

      <form action={createMonitoringSchedule} className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ponto de Coleta</label>
            <select
              name="collection_point_id"
              required
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {pontos.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Parâmetro</label>
            <select
              name="parameter_id"
              required
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {parametros.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tipo de Análise (Define quem fará)</label>
          <select
            name="sample_type"
            required
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione...</option>
            <option value="FIELD">Medição de Campo (Operador)</option>
            <option value="INTERNAL">Análise de Laboratório Interno (Técnico)</option>
            <option value="EXTERNAL">Análise Externa - Coleta de Terceirizado (Técnico)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Frequência Base</label>
          <select
            name="frequency"
            required
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="DAILY">Diária / Dias Específicos</option>
            <option value="PER_SHIFT">Por Turno</option>
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Dias da Semana (Opcional)</label>
          <div className="flex flex-wrap gap-3">
            {[
              { val: 0, label: 'Dom' },
              { val: 1, label: 'Seg' },
              { val: 2, label: 'Ter' },
              { val: 3, label: 'Qua' },
              { val: 4, label: 'Qui' },
              { val: 5, label: 'Sex' },
              { val: 6, label: 'Sáb' },
            ].map(day => (
              <label key={day.val} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="days_of_week" value={day.val} className="rounded border-border bg-background text-muted-foreground" />
                {day.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Se nenhum for selecionado, entende-se que é "Todos os Dias".</p>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Link href="/gestor/cronograma">
            <Button type="button" variant="ghost" className="text-foreground">Cancelar</Button>
          </Link>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar Agendamento</Button>
        </div>
      </form>
    </main>
  )
}
