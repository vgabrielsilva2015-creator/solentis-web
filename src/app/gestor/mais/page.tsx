import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { GESTOR_NAV } from '@/components/gestor/nav-items'

// Página "Mais" (mobile) — menu completo do Gestor, agrupado por seção.
// Reaproveita GESTOR_NAV (mesma lista da sidebar do desktop).
export default function GestorMaisPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Menu</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Todas as áreas de gestão</p>
      </div>

      <div className="space-y-5">
        {GESTOR_NAV.map((item, i) => {
          if (item.type === 'section') {
            return (
              <p key={`s-${i}`} className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-mono">
                {item.label}
              </p>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground hover:bg-muted active:scale-[0.99] transition-all"
            >
              <span className="text-muted-foreground">{item.icon}</span>
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          )
        })}
      </div>
    </main>
  )
}
