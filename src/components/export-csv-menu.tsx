import { Download } from 'lucide-react'
import { diaBR } from '@/lib/export-csv'

/**
 * Botão "Exportar CSV" com período (T-22: a rota exige período, máximo 366 dias).
 * Server Component, sem JS: <details> abre o menu e o período livre é um formulário GET.
 */
export function ExportCsvMenu({ type, status, className = '' }: { type: string; status?: string; className?: string }) {
  const hoje = diaBR(0)
  const extra = status ? `&status=${encodeURIComponent(status)}` : ''
  const atalhos = [
    { label: 'Últimos 30 dias', dias: 29 },
    { label: 'Últimos 90 dias', dias: 89 },
    { label: 'Últimos 12 meses', dias: 364 },
  ]
  return (
    <details className={`relative inline-block ${className}`}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-muted px-3 h-8 text-xs font-medium text-foreground hover:bg-secondary [&::-webkit-details-marker]:hidden">
        <Download className="w-3.5 h-3.5" aria-hidden />
        Exportar CSV
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Período da exportação</p>
        <ul className="space-y-1">
          {atalhos.map((a) => (
            <li key={a.label}>
              <a
                href={`/api/export?type=${type}&from=${diaBR(-a.dias)}&to=${hoje}${extra}`}
                target="_blank"
                rel="noopener"
                className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                {a.label}
              </a>
            </li>
          ))}
        </ul>
        <form action="/api/export" method="get" target="_blank" className="mt-3 space-y-2 border-t border-border pt-3">
          <input type="hidden" name="type" value={type} />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              De
              <input type="date" name="from" required defaultValue={diaBR(-29)} max={hoje} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">
              Até
              <input type="date" name="to" required defaultValue={hoje} max={hoje} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground" />
            </label>
          </div>
          <button type="submit" className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90">
            Exportar período
          </button>
          <p className="text-[11px] text-muted-foreground">Máximo de 366 dias por arquivo.</p>
        </form>
      </div>
    </details>
  )
}
