import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 shrink-0 shadow-sm border border-sky-500/20">
        <span 
          className="text-white text-xl font-black italic tracking-tighter z-10" 
          style={{ paddingRight: '2px', paddingBottom: '1px' }}
        >
          S
        </span>
        <Droplet 
          className="absolute w-[14px] h-[14px] text-sky-100 fill-sky-100 top-1 right-1 z-20 drop-shadow-sm" 
          strokeWidth={1.5} 
        />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}

