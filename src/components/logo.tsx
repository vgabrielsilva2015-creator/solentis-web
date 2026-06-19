import { Droplet } from 'lucide-react'

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* S com Gota (SVG puro usando negative space) */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Definindo a máscara: Tudo que for branco mantém, o que for preto recorta */}
        <mask id="droplet-mask">
          <rect width="32" height="32" fill="white" />
          {/* Gota recortando o S */}
          <path
            d="M23 9C23 9 19.5 13.5 19.5 16C19.5 17.933 21.067 19.5 23 19.5C24.933 19.5 26.5 17.933 26.5 16C26.5 13.5 23 9 23 9Z"
            fill="black"
          />
        </mask>

        {/* Fundo Azul Intacto */}
        <rect width="32" height="32" rx="8" fill="#0ea5e9" />
        
        {/* Letra S Branca com a máscara aplicada. A gota preta da máscara fará um furo no 'S', revelando o azul do fundo */}
        <text
          x="15"
          y="25"
          fontSize="26"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle="italic"
          textAnchor="middle"
          fill="white"
          mask="url(#droplet-mask)"
        >
          S
        </text>
      </svg>
      <span className="text-xl font-bold tracking-tight text-slate-100">
        solentis
      </span>
    </div>
  )
}

