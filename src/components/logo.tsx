import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* S com Gota (Desenhado em SVG Puro) */}
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white overflow-hidden shadow-sm">
        {/* Fundo do S puro em CSS */}
        <span className="absolute text-2xl font-black italic tracking-tighter" style={{ fontFamily: 'Arial, sans-serif', transform: 'scale(1.4) translateY(1px)' }}>
          S
        </span>
        {/* Recorte da gota (simulado via cor do background dark) */}
        <div className="absolute top-0 right-1 text-[#020817] dark:text-[#020817]">
          <Droplet className="h-4 w-4 fill-current stroke-[3px]" />
        </div>
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}

