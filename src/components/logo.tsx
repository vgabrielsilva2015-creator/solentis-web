export function Logo({ className = "", size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? 48 : 32

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="solentis-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Fundo arredondado */}
        <rect width="100" height="100" rx="22" fill="url(#solentis-bg)" />

        {/* Gota d'água estilizada — path vetorial puro */}
        <path
          d="M50 18 C50 18 28 48 28 62 C28 74.15 37.85 84 50 84 C62.15 84 72 74.15 72 62 C72 48 50 18 50 18 Z"
          fill="white"
        />

        {/* Reflexo/brilho — elipse com opacidade na parte superior da gota */}
        <ellipse
          cx="43"
          cy="52"
          rx="8"
          ry="12"
          fill="white"
          opacity="0.35"
          transform="rotate(-15 43 52)"
        />
      </svg>
      <span className={`font-bold tracking-tight text-slate-100 ${size === "lg" ? "text-2xl" : "text-xl"}`}>
        solentis
      </span>
    </div>
  )
}
