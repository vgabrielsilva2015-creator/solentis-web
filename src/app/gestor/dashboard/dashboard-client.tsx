'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface DashboardClientProps {
  dbReadingsToday: number
  dbOpenOccurrences: number
  dbSlaAtRisk: number
  dbConfCurrent: number | null
  dbConfDelta: number | null
  dbSparklineData: number[]
  dbHeatmapPoints: { id: string; name: string; status: 'OK' | 'WARNING' | 'DANGER' }[]
  dbCriticalOccurrences: any[]
  dbOccurrencesPieData: { name: string; value: number; color: string }[]
  dbChemicalConsumptionData: { name: string; unit: string; total: number }[]
  dbTrendData: any[]
  dbParameters: { id: string; name: string; unit: string }[]
  dbSelectedParam: any
  diasNum: number
  paramId?: string
}

// Mock data values (from reference design)
const mockPoints = [
  { key: 'entrada', name: 'Entrada ETE', status: 'crit', ph: 8.9, dqo: 412, trend: [8.2, 8.5, 8.0, 8.8, 9.1, 8.7, 8.9] },
  { key: 'reator', name: 'Reator Biológico', status: 'warn', ph: 7.2, dqo: 180, trend: [7.6, 7.4, 7.8, 7.2, 7.5, 7.3, 7.2] },
  { key: 'decantador', name: 'Decantador', status: 'ok', ph: 7.0, dqo: 95, trend: [7.1, 7.0, 7.2, 6.9, 7.0, 7.1, 7.0] },
  { key: 'saida', name: 'Saída Final', status: 'ok', ph: 7.1, dqo: 33, trend: [7.0, 7.1, 6.9, 7.2, 7.0, 7.1, 7.1] },
];

const mockTrendData = [7.4, 7.1, 7.6, 6.9, 8.2, 7.0, 7.1];

const mockConsumption = {
  cloro: [18, 22, 16, 20, 24, 19, 21],
  sulfato: [40, 38, 44, 36, 42, 39, 41],
  polimero: [8, 9, 7, 10, 8, 9, 8],
};

const mockOccurrences = [
  { t: 'Vazamento de efluente', sev: 'crit', pt: 'Saída Final', ago: 'há 21 min' },
  { t: 'pH fora da faixa CONAMA', sev: 'crit', pt: 'Entrada ETE', ago: 'há 48 min' },
  { t: 'Sólidos suspensos elevados', sev: 'high', pt: 'Decantador', ago: 'há 1 h 12' },
];

const mockFeed = [
  { time: '16:05', who: 'Sistema', text: 'eficiência de remoção subiu para 92%.', type: 'ok' },
  { time: '15:42', who: 'Carlos Lima', text: 'dosou 12 kg de Cloro Granulado.', type: 'chem' },
  { time: '15:18', who: 'Maria Souza', text: 'registrou leitura de pH no Reator Biológico.', type: 'reading' },
  { time: '15:10', who: 'Sistema', text: 'DQO fora do limite na Saída Final.', type: 'alert' },
  { time: '14:32', who: 'João Pereira', text: 'abriu o turno da Tarde.', type: 'shift' },
];

const mockMaintenance = [
  { name: 'Dosadora de Cloro', days: 2 },
  { name: 'Bomba de Recirculação', days: 5 },
  { name: 'Soprador Aerador #2', days: 23 },
  { name: 'Medidor de Vazão', days: 47 },
];

const mockSla = [
  { sev: 'Crítica', avg: 8, meta: 24 },
  { sev: 'Alta', avg: 40, meta: 72 },
  { sev: 'Média', avg: 120, meta: 168 },
  { sev: 'Baixa', avg: 610, meta: 720 },
];

export function DashboardClient({
  dbReadingsToday,
  dbOpenOccurrences,
  dbSlaAtRisk,
  dbConfCurrent,
  dbConfDelta,
  dbSparklineData,
  dbHeatmapPoints,
  dbCriticalOccurrences,
  dbOccurrencesPieData,
  dbChemicalConsumptionData,
  dbTrendData,
  dbParameters,
  dbSelectedParam,
  diasNum,
  paramId,
}: DashboardClientProps) {
  const [drawerKey, setDrawerKey] = useState<string | null>(null)
  const [period, setPeriod] = useState<string>('7d')

  // Check if dashboard is empty
  const isEmpty = dbReadingsToday === 0 && dbOpenOccurrences === 0 && dbTrendData.length === 0 && dbHeatmapPoints.length === 0

  const F = { sora: "'Sora', sans-serif", mono: "'IBM Plex Mono', monospace", body: "'IBM Plex Sans', sans-serif" }

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  // Utility to replace closing parenthesis in oklch dynamically with alpha opacity
  const alpha = (col: string, al: number) => {
    return col.replace(/\)\s*$/, ` / ${al})`)
  }

  const activeVars = {
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

  const statusInfo = (s: string) => {
    if (s === 'crit') return { col: 'var(--danger)', label: 'Crítico' }
    if (s === 'warn') return { col: 'var(--warn)', label: 'Atenção' }
    return { col: 'var(--ok)', label: 'Conforme' }
  }

  const icon = (d: string | string[], size = 18, color = 'currentColor') => {
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

  const cardFrame = (title: string, sub: string, action: React.ReactNode, body: React.ReactNode, eyebrow?: string) => {
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

  const miniEmpty = (text: string) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90px', color: 'var(--txt3)', fontSize: '12.5px', textAlign: 'center', padding: '8px' }}>
        {text}
      </div>
    )
  }

  const emptyState = (kind: 'trend' | 'consumption') => {
    const map = {
      trend: {
        d: 'M22 12h-4l-3 9L9 3l-3 9H2',
        title: 'Sem leituras no período',
        sub: 'Registre a primeira análise para visualizar a tendência dos parâmetros.',
        cta: '+ Registrar leitura',
      },
      consumption: {
        d: ['M9 3h6', 'M10 3v5L5 17a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 8V3', 'M7 14h10'],
        title: 'Nenhum consumo registrado',
        sub: 'Os lançamentos de produtos químicos aparecerão aqui.',
        cta: '+ Lançar consumo',
      },
    }
    const m = map[kind]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '200px', padding: '12px', animation: 'fadeIn .4s ease' }}>
        <div style={{ width: '54px', height: '54px', borderRadius: '15px', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          {icon(m.d, 24, 'var(--brand)')}
        </div>
        <div style={{ fontFamily: F.sora, fontSize: '15px', fontWeight: 600, color: 'var(--txt)' }}>{m.title}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--txt3)', marginTop: '5px', maxWidth: '300px', lineHeight: 1.5 }}>{m.sub}</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button style={{ background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: '9px', padding: '9px 15px', fontSize: '12.5px', fontWeight: 600, fontFamily: F.body, cursor: 'pointer' }}>
            {m.cta}
          </button>
        </div>
      </div>
    )
  }



  const buildSpark = (data: number[], color: string) => {
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

  const buildTrend = (series: number[], small: boolean) => {
    const W = 680
    const H = small ? 150 : 230
    const pl = 30
    const pr = 12
    const pt = 14
    const pb = 24
    const min = 4
    const max = 10
    const n = series.length
    const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1)
    const Y = (v: number) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb)
    const line = series.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
    const area = 'M' + X(0).toFixed(1) + ',' + (H - pb) + ' ' + series.map((v, i) => 'L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') + ' L' + X(n - 1).toFixed(1) + ',' + (H - pb) + ' Z'

    const grid = [5, 6, 7, 8, 9].map((v) => (
      <g key={v}>
        <line x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray={v === 5 || v === 9 ? '4 4' : '0'} />
        <text x={pl - 7} y={Y(v) + 3} textAnchor="end" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
          {v}
        </text>
      </g>
    ))

    const xlabels = days.map((d, i) => (
      <text key={i} x={X(i)} y={H - 7} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
        {d}
      </text>
    ))

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gtrend" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={alpha('var(--brand)', 0.3)} />
            <stop offset="100%" stopColor={alpha('var(--brand)', 0)} />
          </linearGradient>
        </defs>
        <rect x={pl} y={Y(9)} width={W - pl - pr} height={Y(5) - Y(9)} fill={alpha('var(--ok)', 0.07)} />
        {grid}
        <path d={area} fill="url(#gtrend)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={X(n - 1)} cy={Y(series[n - 1])} r={4} fill="var(--brand)" stroke="var(--s1)" strokeWidth={2} />
        {xlabels}
      </svg>
    )
  }

  const buildConsumption = () => {
    const W = 680
    const H = 210
    const pl = 28
    const pr = 10
    const pt = 10
    const pb = 24
    const cc = ['var(--brand)', 'var(--dash-consumption-2)', 'var(--dash-consumption-3)']
    const keys = ['cloro', 'sulfato', 'polimero'] as const
    const totals = days.map((_, i) => keys.reduce((acc, k) => acc + mockConsumption[k][i], 0))
    const max = Math.max(...totals) * 1.15
    const step = (W - pl - pr) / days.length
    const Y = (v: number) => pt + (1 - v / max) * (H - pt - pb)

    const bars = days.map((d, i) => {
      const x = pl + i * step + step * 0.27
      const bw = step * 0.46
      let acc = 0
      const segs = keys.map((k, ki) => {
        const v = mockConsumption[k][i]
        const y0 = Y(acc)
        const y1 = Y(acc + v)
        acc += v
        return <rect key={ki} x={x} y={y1} width={bw} height={Math.max(0, y0 - y1)} fill={cc[ki]} />
      })
      return (
        <g key={i}>
          {segs}
          <text x={x + bw / 2} y={H - 7} textAnchor="middle" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
            {d}
          </text>
        </g>
      )
    })

    const glines = [0, 0.5, 1].map((f, i) => (
      <line key={i} x1={pl} y1={pt + f * (H - pt - pb)} x2={W - pr} y2={pt + f * (H - pt - pb)} stroke="var(--border)" strokeWidth={1} />
    ))

    const legend = (
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {['Cloro Granulado', 'Sulfato de Alumínio', 'Polímero Catiônico'].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: cc[i] }} />
            <span style={{ fontSize: '11.5px', color: 'var(--txt2)' }}>{l}</span>
          </div>
        ))}
      </div>
    )

    return (
      <div>
        {legend}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
          {glines}
          {bars}
        </svg>
      </div>
    )
  }

  const buildRing = (pct: number, color: string, size: number, sw: number, center?: React.ReactNode) => {
    const r = (size - sw) / 2
    const cx = size / 2
    const cy = size / 2
    const circ = 2 * Math.PI * r
    const dash = (Math.max(0, pct) / 100) * circ
    return (
      <div style={{ position: 'relative', width: size + 'px', height: size + 'px', flex: 'none' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s3)" strokeWidth={sw} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={dash + ' ' + (circ - dash)}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        {center && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {center}
          </div>
        )}
      </div>
    )
  }

  const buildDonut = () => {
    const data = [
      { v: 2, col: 'var(--danger)', l: 'Crítica' },
      { v: 1, col: 'var(--warn)', l: 'Alta' },
    ]
    const total = 3
    const r = 42
    const cx = 52
    const cy = 52
    const sw = 12
    const circ = 2 * Math.PI * r
    let off = 0

    const arcs = data.map((d, i) => {
      const len = (d.v / total) * circ
      const el = (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={d.col}
          strokeWidth={sw}
          strokeDasharray={len + ' ' + (circ - len)}
          strokeDashoffset={-off}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )
      off += len
      return el
    })

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ position: 'relative', width: '104px', height: '104px', flex: 'none' }}>
          <svg width={104} height={104} viewBox="0 0 104 104">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s3)" strokeWidth={sw} />
            {arcs}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.sora, fontSize: '24px', fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{total}</span>
            <span style={{ fontFamily: F.mono, fontSize: '9px', letterSpacing: '.08em', color: 'var(--txt3)', marginTop: '3px' }}>ABERTAS</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: d.col }} />
              <span style={{ fontSize: '12.5px', color: 'var(--txt2)' }}>{d.l}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', fontFamily: F.mono }}>{d.v}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Active Points depending on selected filter (Option B removed)
  const activePoints = mockPoints.map((p) => {
    // Check if status is critically configured
    const realPoint = dbHeatmapPoints.find((dp) => dp.name.toLowerCase() === p.name.toLowerCase())
    const status = realPoint
      ? realPoint.status === 'DANGER'
        ? 'crit'
        : realPoint.status === 'WARNING'
          ? 'warn'
          : 'ok'
      : p.status
    return { ...p, status }
  })

  const pickPoint = (k: string) => {
    setDrawerKey(k)
  }

  // Render Collection Points
  const renderPoints = () => {
    const cards = activePoints.map((p) => {
      const si = statusInfo(p.status)
      const borderStyle = '1px solid var(--border)'
      return (
        <div
          key={p.key}
          onClick={() => pickPoint(p.key)}
          style={{
            background: 'var(--s2)',
            border: borderStyle,
            borderRadius: '11px',
            padding: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'transform 0.2s',
          }}
          className="hover:scale-[1.01]"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: si.col, marginLeft: 'auto', flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600 }}>pH {p.ph.toFixed(1)}</span>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)' }}>{p.dqo} mg/L</span>
          </div>
          {isEmpty ? (
            <div style={{ height: '28px', borderRadius: '6px', border: '1px dashed var(--border2)' }} />
          ) : (
            <div style={{ height: '28px' }}>{buildSpark(p.trend, si.col)}</div>
          )}
        </div>
      )
    })

    const hint = 'Clique em um ponto para abrir os detalhes →'
    const body = (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{cards}</div>
        <div style={{ marginTop: '13px', fontSize: '11.5px', color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z', 13, 'var(--brand)')}
          {hint}
        </div>
      </div>
    )
    return cardFrame('Pontos de coleta', '4 pontos · monitoramento ativo', null, body, 'SMM')
  }

  // Draw details (Option A Drawer)
  const renderDrawer = () => {
    if (!drawerKey) return null
    const p = mockPoints.find((pt) => pt.key === drawerKey) || mockPoints[0]
    const si = statusInfo(p.status)
    const close = () => setDrawerKey(null)
    const readings = [
      { t: '16:02', p: 'pH', v: p.ph.toFixed(1), op: 'Maria S.' },
      { t: '15:30', p: 'DQO', v: p.dqo + ' mg/L', op: 'Carlos L.' },
      { t: '14:58', p: 'Turbidez', v: '12 NTU', op: 'Maria S.' },
      { t: '14:20', p: 'OD', v: '4,8 mg/L', op: 'João P.' },
      { t: '13:50', p: 'Temperatura', v: '24,6 °C', op: 'João P.' },
    ]

    const sectionTitle = (t: string) => (
      <div style={{ fontFamily: F.mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--txt3)', margin: '22px 0 10px' }}>
        {t}
      </div>
    )

    const header = (
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: si.col }} />
            <span style={{ fontFamily: F.sora, fontSize: '18px', fontWeight: 700, color: 'var(--txt)' }}>{p.name}</span>
          </div>
          <div style={{ fontSize: '12px', color: si.col, marginTop: '4px', fontWeight: 500 }}>{si.label} · última leitura há 6 min</div>
        </div>
        <button
          onClick={close}
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            color: 'var(--txt2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          {icon('M18 6 6 18 M6 6l12 12', 16)}
        </button>
      </div>
    )

    const trendBlock = <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>{buildTrend(p.trend, true)}</div>

    const readingsBlock = (
      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {readings.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 13px',
              borderTop: i ? '1px solid var(--border)' : 'none',
              background: i % 2 ? 'var(--s1)' : 'var(--s2)',
            }}
          >
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)', width: '38px', flex: 'none' }}>{r.t}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--txt2)', flex: 1 }}>{r.p}</span>
            <span style={{ fontFamily: F.mono, fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>{r.v}</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)', width: '62px', textAlign: 'right', flex: 'none' }}>{r.op}</span>
          </div>
        ))}
      </div>
    )

    const ncBlock =
      p.status === 'ok' ? null : (
        <div key="nc">
          {sectionTitle('Não-conformidades ativas')}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '12px 14px',
              background: alpha(si.col, 0.1),
              border: '1px solid ' + alpha(si.col, 0.3),
              borderRadius: '11px',
            }}
          >
            {icon('M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01', 18, si.col)}
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>
                {p.status === 'crit' ? 'pH acima da faixa CONAMA' : 'DQO em tendência de alta'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>Vence em 23 h · severidade {si.label.toLowerCase()}</div>
            </div>
          </div>
        </div>
      )

    const scroll = (
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
        {sectionTitle('Tendência de pH · 7 dias')}
        {trendBlock}
        {sectionTitle('Últimas 5 leituras')}
        {readingsBlock}
        {ncBlock}
      </div>
    )

    const footer = (
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
        <button
          style={{
            flex: 1,
            background: 'var(--brand)',
            color: 'var(--on-brand)',
            border: 'none',
            borderRadius: '10px',
            padding: '11px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: F.body,
            cursor: 'pointer',
          }}
        >
          + Registrar leitura
        </button>
        <button
          style={{
            flex: 1,
            background: 'transparent',
            color: 'var(--txt)',
            border: '1px solid var(--border2)',
            borderRadius: '10px',
            padding: '11px',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: F.body,
            cursor: 'pointer',
          }}
        >
          Lançar análise
        </button>
      </div>
    )

    return (
      <div>
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 40, animation: 'fadeIn .2s ease' }}
          className="animate-fade-in"
        />
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            maxWidth: '92vw',
            background: 'var(--s1)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-12px 0 40px rgba(0,0,0,.3)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="animate-slide-in-right"
        >
          {header}
          {scroll}
          {footer}
        </div>
      </div>
    )
  }



  // KPI cards renderer
  const renderKpis = () => {
    const confValue = isEmpty ? '—' : dbConfCurrent !== null ? `${dbConfCurrent.toFixed(1)}%` : '92.4%'
    const confDeltaVal = isEmpty ? null : dbConfDelta !== null ? dbConfDelta : 4

    const kpis = [
      {
        title: 'Leituras Hoje',
        val: isEmpty ? 0 : dbReadingsToday > 0 ? dbReadingsToday : 42,
        delta: isEmpty ? null : 12,
        label: 'vs ontem',
        href: '/gestor/leituras',
        spark: isEmpty ? null : dbSparklineData.length > 0 ? dbSparklineData : [12, 14, 10, 15, 18, 16, 21],
        alert: false,
      },
      {
        title: 'Ocorrências Abertas',
        val: isEmpty ? 0 : dbOpenOccurrences > 0 ? dbOpenOccurrences : 3,
        delta: null,
        label: '',
        href: '/gestor/ocorrencias',
        spark: null,
        alert: !isEmpty && (dbOpenOccurrences > 0 || true),
      },
      {
        title: 'SLA em Risco (< 2h)',
        val: isEmpty ? 0 : dbSlaAtRisk > 0 ? dbSlaAtRisk : 1,
        delta: null,
        label: '',
        href: '/gestor/ocorrencias',
        spark: null,
        alert: !isEmpty && (dbSlaAtRisk > 0 || true),
      },
      {
        title: 'Conformidade CONAMA',
        val: confValue,
        delta: confDeltaVal,
        label: `vs ${diasNum}d anteriores`,
        href: null,
        spark: null,
        alert: false,
      },
    ]

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {kpis.map((k, i) => {
          const ruleColor = k.alert ? 'var(--danger)' : 'var(--brand)'
          return (
            <div
              key={i}
              style={{
                background: 'var(--s1)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '16px',
                position: 'relative',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top rule indicator */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: ruleColor, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '11px', color: 'var(--txt3)', fontWeight: 500, fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {k.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }}>
                <span style={{ fontFamily: F.sora, fontSize: '30px', fontWeight: 700, color: 'var(--txt)' }}>{k.val}</span>
                {k.delta !== null && (
                  <span style={{ fontSize: '11.5px', color: k.delta >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontFamily: F.mono }}>
                    {k.delta >= 0 ? '+' : ''}
                    {k.delta}%
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', minHeight: '34px' }}>
                {k.label && <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>{k.label}</span>}
                {k.spark && <div style={{ width: '100px', flexShrink: 0, marginLeft: 'auto' }}>{buildSpark(k.spark, 'var(--brand)')}</div>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Trend Chart Widget
  const renderTrend = () => {
    if (isEmpty) return cardFrame('Tendência por Parâmetro', 'Sem leituras no período', null, emptyState('trend'))
    let series = mockTrendData
    if (dbTrendData.length > 0) {
      series = dbTrendData.map((d) => d.value)
    }

    const dropdown = (
      <select
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--txt2)',
          fontSize: '12px',
          padding: '4px 8px',
          fontFamily: F.body,
          outline: 'none',
        }}
        value={paramId || 'ph'}
        disabled
      >
        <option value="ph">pH (Potencial Hidrogeniônico)</option>
        {dbParameters.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    )

    return cardFrame(
      'Tendência de pH',
      `Faixa CONAMA (5,0–9,0) · ${days.length} dias`,
      dropdown,
      <div style={{ marginTop: '10px' }}>{buildTrend(series, false)}</div>,
      'SMM'
    )
  }

  // Consumption stacked chart widget
  const renderConsumption = () => {
    if (isEmpty) return cardFrame('Consumo químico', 'Os lançamentos aparecerão aqui', null, emptyState('consumption'))
    return cardFrame('Consumo químico', 'Lançamento acumulado por reagente · 7 dias', null, buildConsumption(), 'Estoque')
  }

  // Efficiency progress widget (Anéis de progresso)
  const renderEfficiency = () => {
    if (isEmpty) return cardFrame('Eficiência da ETE', 'Remoção de DQO', null, miniEmpty('Sem leituras de entrada e saída para calcular a eficiência.'), 'Performance')
    const val = 92
    const center = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontFamily: F.sora, fontSize: '26px', fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{val}%</span>
        <span style={{ fontFamily: F.mono, fontSize: '9px', letterSpacing: '.06em', color: 'var(--ok)', marginTop: '3px' }}>▲ 4 pts</span>
      </div>
    )
    const stat = (l: string, v: string, ok?: boolean) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--txt2)' }}>{l}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: F.mono, color: ok ? 'var(--ok)' : 'var(--txt)' }}>{v}</span>
      </div>
    )
    const body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {buildRing(val, 'var(--brand)', 116, 12, center)}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stat('Entrada ETE', '412 mg/L')}
          {stat('Saída Final', '33 mg/L')}
          <div style={{ height: '1px', background: 'var(--border)' }} />
          {stat('Meta CONAMA', '≤ 120 mg/L ✓', true)}
        </div>
      </div>
    )
    return cardFrame('Eficiência da ETE', 'Remoção de DQO · Entrada vs Saída', null, body, 'Performance')
  }

  // Occurrences Severity donut chart widget
  const renderOccurrencesWidget = () => {
    if (isEmpty) return cardFrame('Ocorrências críticas', 'Severidade alta e crítica', null, miniEmpty('Nenhuma ocorrência aberta no período.'), 'Operação')
    const list = mockOccurrences.map((o, i) => {
      const col = o.sev === 'crit' ? 'var(--danger)' : 'var(--warn)'
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ width: '3px', alignSelf: 'stretch', borderRadius: '2px', background: col, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.t}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>{o.pt + ' · ' + o.ago}</div>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: F.mono,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: col,
              background: alpha(col, 0.13),
              padding: '3px 8px',
              borderRadius: '6px',
              flex: 'none',
            }}
          >
            {o.sev === 'crit' ? 'Crítica' : 'Alta'}
          </span>
        </div>
      )
    })
    const body = (
      <div>
        {buildDonut()}
        <div style={{ marginTop: '8px' }}>{list}</div>
      </div>
    )
    return cardFrame('Ocorrências por severidade', 'Abertas · 7 dias', null, body, 'Operação')
  }

  // Real-time timeline feed widget
  const renderFeedWidget = () => {
    if (isEmpty) return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, miniEmpty('Sem atividades registradas hoje.'), 'Tempo real')
    const typeCol = { ok: 'var(--ok)', chem: 'var(--brand)', reading: 'var(--brand)', alert: 'var(--danger)', shift: 'var(--txt3)' }
    const items = mockFeed.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px' }}>
        <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)', width: '40px', flex: 'none', textAlign: 'right', paddingTop: '1px' }}>
          {it.time}
        </span>
        <div style={{ position: 'relative', width: '14px', flex: 'none', display: 'flex', justifyContent: 'center' }}>
          {i < mockFeed.length - 1 && <span style={{ position: 'absolute', top: '14px', bottom: '-6px', width: '2px', background: 'var(--border)' }} />}
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: typeCol[it.type as keyof typeof typeCol] || 'var(--txt3)',
              boxShadow: '0 0 0 3px var(--s1)',
              marginTop: '3px',
              position: 'relative',
              zIndex: 1,
            }}
          />
        </div>
        <div style={{ paddingBottom: '15px', flex: 1, fontSize: '12.5px', color: 'var(--txt2)', lineHeight: 1.45 }}>
          <b style={{ fontWeight: 600, color: 'var(--txt)' }}>{it.who} </b>
          {it.text}
        </div>
      </div>
    ))
    return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, <div style={{ display: 'flex', flexDirection: 'column' }}>{items}</div>, 'Tempo real')
  }

  // Maintenance Ring Indicator
  const renderMaintenanceWidget = () => {
    const rows = mockMaintenance.map((m, i) => {
      const col = m.days < 7 ? 'var(--danger)' : m.days < 30 ? 'var(--warn)' : 'var(--ok)'
      const pct = Math.min(100, (m.days / 60) * 100)
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
          {buildRing(
            pct,
            col,
            38,
            4.5,
            <span style={{ fontFamily: F.mono, fontSize: '9px', fontWeight: 600, color: col }}>
              {m.days}d
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>{m.name}</div>
            <div style={{ fontSize: '11px', color: col, marginTop: '2px' }}>
              Próxima manutenção em {m.days} {m.days === 1 ? 'dia' : 'dias'}
            </div>
          </div>
        </div>
      )
    })
    return cardFrame('Manutenção preventiva', 'Equipamentos críticos', null, <div>{rows}</div>, 'Ativos')
  }

  // SLA Resolution bar chart widget
  const renderSlaWidget = () => {
    if (isEmpty) return cardFrame('Resolução por SLA', 'Tempo médio vs meta', null, miniEmpty('Sem ocorrências resolvidas no período.'), 'Governança')
    const sevCol = { Crítica: 'var(--danger)', Alta: 'var(--warn)', Média: 'var(--brand)', Baixa: 'var(--txt3)' }
    const rows = mockSla.map((s, i) => {
      const within = s.avg <= s.meta
      const pct = Math.min(100, (s.avg / s.meta) * 100)
      const col = within ? 'var(--ok)' : 'var(--danger)'
      const fmt = (v: number) => (v >= 1000 ? (v / 24).toFixed(0) + 'd' : v >= 72 ? (v / 24).toFixed(0) + 'd' : v + 'h')
      return (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--txt)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: sevCol[s.sev as keyof typeof sevCol] }} />
              {s.sev}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt2)' }}>
              {fmt(s.avg)} · meta {fmt(s.meta)}
            </span>
          </div>
          <div style={{ height: '7px', borderRadius: '4px', background: 'var(--s3)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: '4px', background: col }} />
          </div>
        </div>
      )
    })
    return cardFrame(
      'Resolução por SLA',
      'Tempo médio vs meta',
      null,
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>{rows}</div>,
      'Governança'
    )
  }

  return (
    <div style={activeVars} className="min-h-screen">
      <main className="px-6 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: F.sora, fontSize: '24px', fontWeight: 700, letterSpacing: '-.02em', margin: 0, color: 'var(--txt)' }}>
              Visão Geral
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'var(--txt3)' }}>Status operacional e ambiental em tempo real.</p>
          </div>

          <div style={{ display: 'inline-flex', gap: '3px', padding: '3px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
            {[1, 7, 30].map((d) => (
              <Link
                key={d}
                href={`/gestor/dashboard?dias=${d}${paramId ? `&paramId=${paramId}` : ''}`}
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  border: 'none',
                  fontFamily: F.body,
                  fontSize: '12px',
                  fontWeight: diasNum === d ? 600 : 500,
                  background: diasNum === d ? 'var(--s1)' : 'transparent',
                  color: diasNum === d ? 'var(--txt)' : 'var(--txt2)',
                  boxShadow: diasNum === d ? 'var(--shadow-sm)' : 'none',
                  textDecoration: 'none',
                  transition: 'all .15s',
                }}
              >
                {d === 1 ? '24h' : `${d}d`}
              </Link>
            ))}
          </div>
        </div>

        {/* Row 1: KPIs */}
        {renderKpis()}

        {/* Row 2: Charts (pH Trend / stacked chemicals / collection points / efficiency / occurrences donut) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '18px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderTrend()}
            {renderConsumption()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderPoints()}
            {renderEfficiency()}
            {renderOccurrencesWidget()}
          </div>
        </div>

        {/* Row 3: Widgets (Feed, Maintenance, SLA) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {renderFeedWidget()}
          {renderMaintenanceWidget()}
          {renderSlaWidget()}
        </div>
      </main>

      {/* Option A Drawer details sheet */}
      {renderDrawer()}
    </div>
  )
}
