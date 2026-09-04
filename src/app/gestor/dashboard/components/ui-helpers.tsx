import React from 'react'

export const F = { sora: "'Sora', sans-serif", mono: "'IBM Plex Mono', monospace", body: "'IBM Plex Sans', sans-serif" }

export const activeVars = {
  '--bg': 'var(--dash-bg)',
  '--s1': 'var(--dash-s1)',
  '--s2': 'var(--dash-s2)',
  '--s3': 'var(--dash-s3)',
  '--border': 'var(--dash-border)',
  '--border2': 'var(--dash-border2)',
  '--txt': 'var(--dash-txt)',
  '--txt2': 'var(--dash-txt2)',
  '--txt3': 'var(--dash-txt3)',
  '--brand': 'var(--dash-brand)',
  '--brand-soft': 'var(--dash-brand-soft)',
  '--brand-line': 'var(--dash-brand-line)',
  '--ok': 'var(--dash-ok)',
  '--ok-soft': 'var(--dash-ok-soft)',
  '--warn': 'var(--dash-warn)',
  '--warn-soft': 'var(--dash-warn-soft)',
  '--danger': 'var(--dash-danger)',
  '--danger-soft': 'var(--dash-danger-soft)',
  '--on-brand': 'var(--dash-on-brand)',
  '--shadow': 'var(--dash-shadow)',
  '--shadow-sm': 'var(--dash-shadow-sm)',
  background: 'var(--bg)',
  color: 'var(--txt)',
  fontFamily: F.body,
} as React.CSSProperties

export const alpha = (col: string, al: number) => {
  return `color-mix(in oklch, ${col} ${Math.round(al * 100)}%, transparent)`
}

export const statusInfo = (s: string) => {
  if (s === 'crit') return { col: 'var(--danger)', label: 'Crítico' }
  if (s === 'warn') return { col: 'var(--warn)', label: 'Atenção' }
  return { col: 'var(--ok)', label: 'Conforme' }
}

export const icon = (d: string | string[], size = 18, color = 'currentColor') => {
  const ds = Array.isArray(d) ? d : [d]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {ds.map((dd, i) => (
        <path key={i} d={dd} />
      ))}
    </svg>
  )
}

export const cardFrame = (title: string, sub: string, action: React.ReactNode, body: React.ReactNode, eyebrow?: string) => {
  return (
    <section
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '18px',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '15px' }}>
        <div>
          {eyebrow && (
            <div style={{ fontFamily: F.mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: '5px' }}>
              {eyebrow}
            </div>
          )}
          <div style={{ fontFamily: F.sora, fontSize: '15px', fontWeight: 600, color: 'var(--txt)' }}>{title}</div>
          {sub && <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '4px' }}>{sub}</div>}
        </div>
        {action}
      </div>
      {body}
    </section>
  )
}

export const miniEmpty = (text: string) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90px', color: 'var(--txt3)', fontSize: '12.5px', textAlign: 'center', padding: '8px' }}>
      {text}
    </div>
  )
}

export const buildSpark = (data: number[], color: string) => {
  const W = 120
  const H = 34
  const pad = 4
  const min = Math.min(...data)
  const max = Math.max(...data)
  const rng = max - min || 1
  const X = (i: number) => (i * W) / (data.length - 1)
  const Y = (v: number) => pad + (1 - (v - min) / rng) * (H - 2 * pad)
  const line = data.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
  const area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill={alpha(color, 0.16)} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const buildRing = (pct: number, color: string, size: number, sw: number, center?: React.ReactNode) => {
  const r = (size - sw) / 2
  const c = Math.PI * 2 * r
  const dash = (pct / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {center}
        </div>
      )}
    </div>
  )
}
