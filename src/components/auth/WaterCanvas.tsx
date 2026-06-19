'use client'

import { Logo } from '@/components/logo'
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react'

export function WaterCanvas({ tagline = "Conformidade ambiental em tempo real." }: { tagline?: string }) {
  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-background">
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, oklch(0.25 0.04 220 / 0.6), transparent 65%)'
        }}
      />

      {/* SVG Water Ripples Animation */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Noise overlay */}
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.04" />

          {/* Animated Water Lines */}
          <g className="motion-reduce:hidden" stroke="var(--color-data)" strokeWidth="0.2" fill="none" opacity="0.18">
            <path d="M-20,50 Q10,40 40,50 T100,50 T160,50">
              <animate attributeName="d" dur="18s" repeatCount="indefinite"
                values="M-20,50 Q10,40 40,50 T100,50 T160,50; M-20,50 Q10,60 40,50 T100,50 T160,50; M-20,50 Q10,40 40,50 T100,50 T160,50" />
            </path>
            <path d="M-20,60 Q20,70 60,60 T140,60 T220,60">
              <animate attributeName="d" dur="22s" repeatCount="indefinite"
                values="M-20,60 Q20,70 60,60 T140,60 T220,60; M-20,60 Q20,50 60,60 T140,60 T220,60; M-20,60 Q20,70 60,60 T140,60 T220,60" />
            </path>
            <path d="M-20,75 Q30,65 80,75 T180,75 T280,75">
              <animate attributeName="d" dur="26s" repeatCount="indefinite"
                values="M-20,75 Q30,65 80,75 T180,75 T280,75; M-20,75 Q30,85 80,75 T180,75 T280,75; M-20,75 Q30,65 80,75 T180,75 T280,75" />
            </path>
          </g>

          {/* Static fallbacks for reduced motion */}
          <g className="hidden motion-reduce:block" stroke="var(--color-data)" strokeWidth="0.2" fill="none" opacity="0.18">
            <path d="M-20,50 Q10,40 40,50 T100,50 T160,50" />
            <path d="M-20,60 Q20,70 60,60 T140,60 T220,60" />
          </g>

          {/* Bubbles */}
          <g className="motion-reduce:hidden" fill="var(--color-data)" opacity="0.12">
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx={20 + i * 10} cy="110" r={0.5 + Math.random() * 1.5}>
                <animate 
                  attributeName="cy" 
                  from="110" 
                  to="-10" 
                  dur={`${22 + Math.random() * 8}s`} 
                  begin={`${Math.random() * 10}s`} 
                  repeatCount="indefinite" 
                />
                <animate 
                  attributeName="opacity" 
                  values="0;0.6;0" 
                  keyTimes="0;0.5;1" 
                  dur={`${22 + Math.random() * 8}s`} 
                  begin={`${Math.random() * 10}s`} 
                  repeatCount="indefinite" 
                />
              </circle>
            ))}
          </g>
        </svg>
      </div>

      {/* Content Top */}
      <div className="relative z-10 p-8 lg:p-16">
        <Logo size="lg" className="mb-8" />
        <h1 className="text-3xl lg:text-4xl font-display tracking-tight text-foreground max-w-md">
          {tagline}
        </h1>
        <p className="text-base text-muted-foreground max-w-md mt-4 leading-relaxed">
          Plataforma de monitoramento avançado para estações de tratamento de efluentes.
        </p>
      </div>

      {/* Content Bottom */}
      <div className="relative z-10 p-8 lg:p-16 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Badge icon={ShieldCheck}>LGPD compliant</Badge>
          <Badge icon={Lock}>ISO 27001</Badge>
          <Badge icon={CheckCircle2}>Padrão CONAMA</Badge>
        </div>
        
        <div className="text-xs text-muted-foreground/60 flex items-center gap-3">
          <span>© {new Date().getFullYear()} Solentis</span>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Termos</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
        </div>
      </div>
    </div>
  )
}

function Badge({ children, icon: Icon }: { children: React.ReactNode, icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface/60 backdrop-blur border border-border px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
      <Icon className="w-3.5 h-3.5 text-success" />
      {children}
    </div>
  )
}
