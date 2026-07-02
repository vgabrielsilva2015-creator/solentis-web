import Link from 'next/link'
import React from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | string
  delta?: number | null
  deltaLabel?: string
  href?: string
  sparklineData?: number[]
  alert?: boolean
}

export function KpiCard({
  title,
  value,
  delta,
  deltaLabel = 'vs período anterior',
  href,
  sparklineData = [],
  alert = false,
}: KpiCardProps) {
  // Configuração visual do delta
  const isPositive = delta && delta > 0
  const isNegative = delta && delta < 0
  const isNeutral = !isPositive && !isNegative

  // Corrente de cores para o SVG da sparkline (verde se positivo, senão red, ou cinza)
  let strokeColor = 'var(--color-slate-500)'
  if (isPositive) strokeColor = 'var(--color-status-ok)'
  if (isNegative) strokeColor = 'var(--color-status-danger)'

  // Renderização simples de path SVG
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null

    const max = Math.max(...sparklineData, 1) // evitar /0
    const min = Math.min(...sparklineData, 0)
    const range = max - min
    const width = 100
    const height = 30
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    }).join(' L ')

    return (
      <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-4 opacity-70">
        <path d={`M ${points}`} fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  const innerContent = (
    <>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <div className="flex items-baseline justify-between">
          <p className={`text-3xl font-semibold tabular-nums tracking-tight ${alert ? 'text-status-danger' : 'text-foreground'}`}>
            {value}
          </p>
          
          <div className="flex items-center gap-1 text-xs">
            {delta === null || delta === undefined ? (
              <span className="flex items-center text-muted-foreground font-mono">
                <Minus className="w-3 h-3 mr-0.5" /> —
              </span>
            ) : isPositive ? (
              <span className="flex items-center text-status-ok font-mono">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> {delta}%
              </span>
            ) : isNegative ? (
              <span className="flex items-center text-status-danger font-mono">
                <ArrowDownRight className="w-3 h-3 mr-0.5" /> {Math.abs(delta)}%
              </span>
            ) : (
              <span className="flex items-center text-muted-foreground font-mono">
                <Minus className="w-3 h-3 mr-0.5" /> 0%
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {deltaLabel}
        </p>
      </div>

      {sparklineData.length > 0 ? (
        renderSparkline()
      ) : (
        <div className="mt-4 h-[30px] flex items-center justify-start">
           <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Sem dados no período</span>
        </div>
      )}
    </>
  )

  const commonClasses = `group relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all ${
    alert ? 'border-status-danger/40 bg-status-danger/5' : 'border-border bg-card/50'
  }`

  if (href) {
    return (
      <Link href={href} className={`${commonClasses} hover:bg-muted/50`}>
        {innerContent}
      </Link>
    )
  }

  return (
    <div className={commonClasses}>
      {innerContent}
    </div>
  )
}
