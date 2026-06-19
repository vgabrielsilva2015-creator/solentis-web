import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* S com Gota (SVG puro com mask transparente verdadeira) */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Definindo a máscara (o que for branco aparece, o que for preto recorta) */}
        <mask id="droplet-mask">
          <rect width="32" height="32" fill="white" rx="8" />
          {/* Gota no canto superior direito pintada de preto para recortar o fundo */}
          <path
            d="M24 8C24 8 20.5 12.5 20.5 15C20.5 16.933 22.067 18.5 24 18.5C25.933 18.5 27.5 16.933 27.5 15C27.5 12.5 24 8 24 8Z"
            fill="black"
          />
        </mask>

        {/* Grupo principal com a máscara aplicada */}
        <g mask="url(#droplet-mask)">
          <rect width="32" height="32" rx="8" fill="#0ea5e9" />
          <text
            x="15"
            y="25"
            fontSize="26"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontStyle="italic"
            textAnchor="middle"
            fill="white"
          >
            S
          </text>
        </g>
      </svg>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}

