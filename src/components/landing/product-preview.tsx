import {
  Activity, AlertTriangle, ArrowUpRight, Beaker, Bell, ChevronDown, Clock,
  FlaskConical, LayoutDashboard, Wrench,
} from 'lucide-react'
import { Logo } from './logo'

const metrics = [
  { label: 'Leituras registradas', value: '24', detail: 'No turno atual', icon: Activity, tone: 'text-primary' },
  { label: 'Conformidade', value: '96%', detail: 'Parâmetros dentro do limite', icon: FlaskConical, tone: 'text-success' },
  { label: 'Ocorrências abertas', value: '03', detail: '1 de alta prioridade', icon: AlertTriangle, tone: 'text-warning' },
  { label: 'Manutenções', value: '02', detail: 'Preventivas programadas', icon: Wrench, tone: 'text-primary' },
]

export function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Exemplo ilustrativo do painel de gestão do Solentis">
      <aside className="hidden border-r border-border bg-card p-5 lg:block">
        <Logo />
        <div className="mt-9 flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs font-medium">
          ETE industrial <ChevronDown className="size-3" />
        </div>
        <div className="mt-7 space-y-1.5 text-sm">
          {[
            [LayoutDashboard, 'Dashboard'],
            [Activity, 'Leituras'],
            [FlaskConical, 'Análises'],
            [AlertTriangle, 'Ocorrências'],
            [Beaker, 'Produtos químicos'],
            [Wrench, 'Manutenção'],
            [Clock, 'Turnos'],
          ].map(([I, label], index) => {
            const Icon = I as typeof Activity
            return (
              <div
                key={String(label)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${index === 0 ? 'bg-accent font-semibold text-primary' : 'text-muted-foreground'}`}
              >
                <Icon className="size-4" />
                {String(label)}
              </div>
            )
          })}
        </div>
        <p className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">Gestão da estação</p>
      </aside>
      <div className="min-w-0">
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-5 text-xs">
          <span className="text-muted-foreground">
            Gestão <span className="mx-2">/</span>
            <span className="font-medium text-foreground">Dashboard</span>
          </span>
          <span className="flex items-center gap-3 text-muted-foreground">
            <span className="hidden sm:inline">Exemplo ilustrativo</span>
            <Bell className="size-4" />
            <span className="grid size-7 place-items-center rounded-full bg-accent font-semibold text-primary">G</span>
          </span>
        </div>
        <div className="p-4 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">VISÃO GERAL DA PLANTA</p>
              <h2 className="mt-1 text-xl font-semibold">Dashboard</h2>
            </div>
            <span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
              <span className="size-1.5 rounded-full bg-success" />
              Turno B
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className={`size-4 shrink-0 ${tone}`} />
                </div>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Monitoramento de parâmetros</h3>
                <Activity className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Saída tratada · Últimas leituras</p>
              <div className="mt-5 grid grid-cols-[1fr_0.8fr_1fr] border-b border-border pb-2 text-xs text-muted-foreground">
                <span>Parâmetro</span>
                <span>Resultado</span>
                <span className="text-right">Situação</span>
              </div>
              {[
                ['pH', '7,2', 'Conforme'],
                ['DQO', '118 mg/L', 'Conforme'],
                ['SST', '64 mg/L', 'Fora do limite'],
                ['Eficiência DBO', '92%', 'Conforme'],
              ].map(([parameter, value, status]) => (
                <div
                  key={parameter}
                  className="grid grid-cols-[1fr_0.8fr_1fr] items-center gap-1 border-b border-border py-3 text-xs last:border-0"
                >
                  <span className="font-medium">{parameter}</span>
                  <span className="tabular-nums">{value}</span>
                  <span className={`text-right ${status === 'Conforme' ? 'text-success' : 'text-destructive'}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Atenção no turno</h3>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-5 border-l-2 border-destructive pl-3">
                <p className="text-xs font-semibold">SST acima do limite</p>
                <p className="mt-1 text-xs text-muted-foreground">Saída tratada · Em aberto</p>
              </div>
              <div className="mt-5 border-l-2 border-warning pl-3">
                <p className="text-xs font-semibold">Estoque de soda cáustica</p>
                <p className="mt-1 text-xs text-muted-foreground">Reposição necessária</p>
              </div>
              <div className="mt-5 border-l-2 border-primary pl-3">
                <p className="text-xs font-semibold">Bomba dosadora P-03</p>
                <p className="mt-1 text-xs text-muted-foreground">Manutenção preventiva programada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
