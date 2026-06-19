import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0ea5e9] shrink-0 shadow-sm">
        <span 
          className="text-white text-[22px] font-black italic z-10" 
          style={{ fontFamily: 'Arial, sans-serif', paddingRight: '2px', paddingBottom: '2px' }}
        >
          S
        </span>
        <Droplet 
          className="absolute w-[12px] h-[12px] text-[#e0f2fe] fill-[#e0f2fe] z-20 drop-shadow-sm" 
          style={{ top: '4px', right: '4px' }}
          strokeWidth={1} 
        />
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}


