import { AlertTriangle, Beaker, Droplets, Wrench } from 'lucide-react'

const rows = [
  { p: 'pH', v: '7,2', lim: '6,0 – 9,0', ok: true, w: 55 },
  { p: 'DQO (mg/L)', v: '118', lim: '≤ 150', ok: true, w: 78 },
  { p: 'SST (mg/L)', v: '64', lim: '≤ 60', ok: false, w: 100 },
  { p: 'Eficiência DBO', v: '92%', lim: '≥ 80%', ok: true, w: 92 },
]

export function ReadingsCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-lg p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Droplets className="size-4 text-primary" /> Leituras · Saída tratada
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
          Turno B
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.p}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{r.p}</span>
              <span className="font-mono font-semibold tabular-nums">
                {r.v} <span className="text-xs font-normal text-muted-foreground">({r.lim})</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${r.ok ? 'bg-brand' : 'bg-destructive'}`}
                style={{ width: `${r.w}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StockCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-lg p-5 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Beaker className="size-4 text-primary" /> Estoque químico
      </div>
      <div className="mt-3 space-y-2.5 text-sm">
        {[
          ['Polímero catiônico', 72],
          ['Hipoclorito', 34],
          ['Soda cáustica', 18],
        ].map(([n, v]) => (
          <div key={n as string} className="flex items-center gap-3">
            <span className="w-32 truncate text-muted-foreground">{n}</span>
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${(v as number) < 25 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="w-9 text-right font-medium tabular-nums">{v}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IncidentCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Ocorrência aberta</p>
          <p className="text-xs text-muted-foreground">SST acima do limite · Decantador 2</p>
        </div>
      </div>
    </div>
  )
}

export function MaintenanceCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-lg p-5 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wrench className="size-4 text-primary" /> Manutenção
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {[
          ['Bomba dosadora P-03', 'Preventiva', 'Hoje'],
          ['Soprador S-01', 'Corretiva', 'Em andamento'],
          ['Inversor do agitador', 'Preventiva', 'Em 3 dias'],
        ].map(([a, t, s]) => (
          <li key={a} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
            <span>
              <span className="font-medium">{a}</span>{' '}
              <span className="text-xs text-muted-foreground">· {t}</span>
            </span>
            <span className="text-xs text-muted-foreground">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ShiftCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-lg p-5 ${className}`}>
      <p className="text-sm font-semibold">Passagem de turno · A → B</p>
      <ul className="mt-3 space-y-2 text-sm">
        {[
          'Checklist da estação concluído',
          '12 leituras registradas',
          '1 ocorrência repassada ao próximo turno',
        ].map((t, i) => (
          <li key={t} className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${i === 2 ? 'bg-warning' : 'bg-success'}`} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
