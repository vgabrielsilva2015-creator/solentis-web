import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* S com Gota (Vetor Geométrico Puro) */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          {/* Fundo com gradiente premium */}
          <linearGradient id="bg-grad" x1="0" y1="0" x2="100" y2="100">
            <stop stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
          
          {/* Máscara: Tudo branco fica visível, gota preta faz o recorte */}
          <mask id="drop-cutout">
            <rect width="100" height="100" fill="white" />
            {/* Gota milimetricamente calculada para ficar dentro da ponta superior direita do S */}
            <path 
              d="M75 16 C75 16 67 26 67 32 C67 36.4 70.6 40 75 40 C79.4 40 83 36.4 83 32 C83 26 75 16 75 16 Z" 
              fill="black" 
            />
          </mask>
        </defs>

        {/* Quadrado base */}
        <rect width="100" height="100" rx="22" fill="url(#bg-grad)" />
        
        {/* Letra S desenhada matematicamente com a gota recortada na ponta */}
        <path 
          d="M 75 30 C 75 10, 25 10, 25 35 C 25 55, 75 45, 75 65 C 75 90, 25 90, 25 70" 
          stroke="white" 
          strokeWidth="20" 
          strokeLinecap="round" 
          fill="none" 
          mask="url(#drop-cutout)" 
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}

