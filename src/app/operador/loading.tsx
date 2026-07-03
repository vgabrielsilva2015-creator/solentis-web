// Skeleton com a forma do dashboard do operador — dá sensação de carregamento
// rápido. animate-pulse só nos blocos cinza, nunca na tela toda.
export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-28 rounded bg-card animate-pulse" />
      </div>

      {/* Card-herói do turno */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
      </div>

      {/* 2 chips de alerta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-20 rounded-xl border border-border bg-card animate-pulse" />
      </div>

      {/* Checklist de coletas */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    </main>
  )
}
