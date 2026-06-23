'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ParamSelector } from './param-selector'
import { registrarLeitura } from '@/app/operador/leituras/actions'
import { obterDetalhesPonto } from './actions'

interface DashboardClientProps {
  dbTotalRegistersToday: number
  dbRegistersDelta: number | null
  dbProgress: {
    field: { done: number; scheduled: number }
    internal: { done: number; scheduled: number }
    external: { done: number; scheduled: number }
  }
  dbOpenOccurrences: number
  dbConfCurrent: number | null
  dbConfDelta: number | null
  dbSparklineData: number[]
  dbHeatmapPoints: { id: string; name: string; status: 'OK' | 'WARNING' | 'DANGER' }[]
  dbCriticalOccurrences: any[]
  dbOccurrencesPieData: { name: string; value: number; color: string }[]
  dbChemicalConsumptionData: { name: string; unit: string; total: number }[]
  dbTrendData: any[]
  dbFeed: any[]
  dbMaintenance: any[]
  dbParameters: { id: string; name: string; unit: string; min_limit?: number | null; max_limit?: number | null }[]
  dbSelectedParam: any
  diasNum: number
  paramId?: string
  pontoId?: string
  activePointName?: string | null
  eteStatus: 'OK' | 'WARNING' | 'DANGER'
  activeOperatorName: string | null
  activeShiftName: string | null
  absoluteLatestReading: {
    type: 'FIELD' | 'INTERNAL' | 'EXTERNAL'
    date: string | Date
    parameterName: string
    pointName: string
    value: number | null
    unit: string
    isNonConformant: boolean
  } | null
  latestNCToday: {
    date: string | Date
    parameterName: string
    pointName: string
    value: number | null
    unit: string
  } | null
}

export function DashboardClient({
  dbTotalRegistersToday,
  dbRegistersDelta,
  dbProgress,
  dbOpenOccurrences,
  dbConfCurrent,
  dbConfDelta,
  dbSparklineData,
  dbHeatmapPoints,
  dbCriticalOccurrences,
  dbOccurrencesPieData,
  dbChemicalConsumptionData,
  dbTrendData,
  dbFeed,
  dbMaintenance,
  dbParameters,
  dbSelectedParam,
  diasNum,
  paramId,
  pontoId,
  activePointName,
  eteStatus,
  activeOperatorName,
  activeShiftName,
  absoluteLatestReading,
  latestNCToday,
}: DashboardClientProps) {
  const router = useRouter()
  const [period, setPeriod] = useState<string>('7d')

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null)
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerData, setDrawerData] = useState<any>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // Modal state
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false)
  const [modalCollectionPointId, setModalCollectionPointId] = useState('')
  const [modalParameterId, setModalParameterId] = useState('')
  const [modalValue, setModalValue] = useState('')
  const [modalUnit, setModalUnit] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalRecordedAt, setModalRecordedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSuccess, setModalSuccess] = useState(false)

  const handlePointClick = async (pointId: string) => {
    setIsDrawerOpen(true)
    setDrawerLoading(true)
    setDrawerError(null)
    setDrawerData(null)
    try {
      const data = await obterDetalhesPonto(pointId)
      setDrawerData(data)
    } catch (err: any) {
      setDrawerError(err.message || 'Erro ao carregar detalhes do ponto')
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleParameterChange = (pId: string) => {
    setModalParameterId(pId)
    const param = dbParameters.find(p => p.id === pId)
    if (param) {
      setModalUnit(param.unit || '')
    } else {
      setModalUnit('')
    }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setModalError(null)

    try {
      const formData = new FormData()
      formData.append('collection_point_id', modalCollectionPointId)
      formData.append('parameter_id', modalParameterId)
      formData.append('value', modalValue)
      formData.append('unit', modalUnit)
      formData.append('notes', modalNotes)
      formData.append('recorded_at', modalRecordedAt)

      const result = await registrarLeitura({}, formData)

      if (result.error) {
        setModalError(result.error)
      } else if (result.fieldErrors) {
        const firstErr = Object.values(result.fieldErrors)[0]?.[0]
        setModalError(firstErr || 'Erro de validação')
      } else if (result.success) {
        setModalSuccess(true)
        // Reset form
        setModalCollectionPointId('')
        setModalParameterId('')
        setModalValue('')
        setModalUnit('')
        setModalNotes('')
        setTimeout(() => {
          setIsReadingModalOpen(false)
          setModalSuccess(false)
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setModalError(err.message || 'Erro ao registrar leitura')
    } finally {
      setIsSubmitting(false)
    }
  }

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
    const pl = 40
    const pr = 12
    const pt = 14
    const pb = 24
    
    // Calcular min e max dinamicamente com margem
    const seriesMin = Math.min(...series)
    const seriesMax = Math.max(...series)
    
    // Obter limites CONAMA do parametro
    const paramMin = dbSelectedParam?.min_limit ?? null
    const paramMax = dbSelectedParam?.max_limit ?? null
    
    const allVals = [...series]
    if (paramMin !== null) allVals.push(paramMin)
    if (paramMax !== null) allVals.push(paramMax)
    
    const absoluteMin = Math.min(...allVals)
    const absoluteMax = Math.max(...allVals)
    
    const range = absoluteMax - absoluteMin || 1
    const min = Math.max(0, absoluteMin - range * 0.1)
    const max = absoluteMax + range * 0.1
    
    const n = series.length
    const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1)
    const Y = (v: number) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb)
    
    const line = series.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
    const area = 'M' + X(0).toFixed(1) + ',' + (H - pb) + ' ' + series.map((v, i) => 'L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') + ' L' + X(n - 1).toFixed(1) + ',' + (H - pb) + ' Z'

    // Gerar linhas de grade
    const steps = 5
    const gridVals: number[] = []
    for (let i = 0; i < steps; i++) {
      gridVals.push(min + (i * (max - min)) / (steps - 1))
    }

    const grid = gridVals.map((v, idx) => (
      <g key={idx}>
        <line x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={pl - 7} y={Y(v) + 3} textAnchor="end" fontFamily={F.mono} fontSize={9} fill="var(--txt3)">
          {v.toFixed(1)}
        </text>
      </g>
    ))

    // Se houver limites CONAMA, desenhar linhas de referência coloridas no gráfico
    const limitLines = (
      <>
        {paramMin !== null && (
          <g>
            <line x1={pl} y1={Y(paramMin)} x2={W - pr} y2={Y(paramMin)} stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={W - pr - 5} y={Y(paramMin) - 4} textAnchor="end" fontFamily={F.mono} fontSize={8} fill="var(--warn)">
              Min: {paramMin.toFixed(1)}
            </text>
          </g>
        )}
        {paramMax !== null && (
          <g>
            <line x1={pl} y1={Y(paramMax)} x2={W - pr} y2={Y(paramMax)} stroke="var(--danger)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={W - pr - 5} y={Y(paramMax) - 4} textAnchor="end" fontFamily={F.mono} fontSize={8} fill="var(--danger)">
              Max: {paramMax.toFixed(1)}
            </text>
          </g>
        )}
      </>
    )

    // Formatar os labels do eixo X
    const xlabels = dbTrendData.map((d, i) => {
      // Mostrar apenas alguns labels para não encavalar
      const showLabel = n <= 7 || i === 0 || i === n - 1 || (n <= 15 && i % 2 === 0) || (n <= 30 && i % 5 === 0) || (i % 10 === 0)
      if (!showLabel) return null
      return (
        <text key={i} x={X(i)} y={H - 7} textAnchor="middle" fontFamily={F.mono} fontSize={8} fill="var(--txt3)">
          {d.timeStr}
        </text>
      )
    })

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gtrend" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={alpha('var(--brand)', 0.3)} />
            <stop offset="100%" stopColor={alpha('var(--brand)', 0)} />
          </linearGradient>
        </defs>
        {/* Colorir área conforme se aplicável */}
        {paramMin !== null && paramMax !== null && (
          <rect x={pl} y={Y(paramMax)} width={W - pl - pr} height={Y(paramMin) - Y(paramMax)} fill={alpha('var(--ok)', 0.05)} />
        )}
        {grid}
        {limitLines}
        <path d={area} fill="url(#gtrend)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Marcar pontos não conformes em vermelho */}
        {dbTrendData.map((d, i) => {
          const isNonConform = (paramMin !== null && d.value < paramMin) || (paramMax !== null && d.value > paramMax)
          return (
            <circle
              key={i}
              cx={X(i)}
              cy={Y(d.value)}
              r={isNonConform ? 4 : 3}
              fill={isNonConform ? 'var(--danger)' : 'var(--brand)'}
              stroke="var(--s1)"
              strokeWidth={1.5}
            />
          )
        })}
        {xlabels}
      </svg>
    )
  }

  const buildConsumption = () => {
    if (dbChemicalConsumptionData.length === 0) return miniEmpty('Sem consumo registrado no período.')
    const max = Math.max(...dbChemicalConsumptionData.map(d => d.total))
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        {dbChemicalConsumptionData.slice(0, 5).map((chem, i) => {
          const pct = max > 0 ? (chem.total / max) * 100 : 0
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{chem.name}</span>
                <span style={{ fontFamily: F.mono, color: 'var(--txt2)' }}>{chem.total} {chem.unit}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--s3)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: 'var(--brand)', borderRadius: '3px' }} />
              </div>
            </div>
          )
        })}
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
    const data = dbOccurrencesPieData.filter(d => d.value > 0).map(d => ({ v: d.value, col: d.color, l: d.name }))
    if (data.length === 0) return miniEmpty('Nenhuma ocorrência neste período.')
    
    const total = data.reduce((sum, d) => sum + d.v, 0)
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
  const activePoints = dbHeatmapPoints

  const pickPoint = (k: string) => {
    // Navigate and set pontoId in URL search params
    const url = new URL(window.location.href)
    url.searchParams.set('pontoId', k)
    router.push(url.pathname + url.search)
  }

  // Render Collection Points
  const renderPoints = () => {
    const getPointIcon = (name: string) => {
      const lower = name.toLowerCase()
      if (lower.includes('entrada') || lower.includes('afluente') || lower.includes('bruto')) {
        // Arrow pointing in
        return icon('M19 12H5m7-7-7 7 7 7', 20, 'currentColor')
      }
      if (lower.includes('reator') || lower.includes('tanque') || lower.includes('biológico') || lower.includes('aeróbio')) {
        // Reactor / cycle circle
        return icon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'M12 6v6l4 2'], 20, 'currentColor')
      }
      if (lower.includes('decantador') || lower.includes('filtro') || lower.includes('sedimentador')) {
        // Funnel / filter icon
        return icon('M22 3H2l8 9.46V19l4 2v-8.54L22 3z', 20, 'currentColor')
      }
      if (lower.includes('saída') || lower.includes('descarte') || lower.includes('efluente tratado') || lower.includes('deságue')) {
        // Arrow pointing out / drop
        return icon('M5 12h14m-7-7 7 7-7 7', 20, 'currentColor')
      }
      // Fallback: wave / sensor icon
      return icon(['M2 10h20', 'M2 14h20'], 20, 'currentColor')
    }

    const cards = activePoints.map((p) => {
      let statusLabel = 'Conforme'
      let statusColor = 'var(--ok)'
      let subInfo = 'Últimas 24h conformes'
      let glow = 'none'

      if (p.status === 'DANGER') {
        statusLabel = 'Fora dos Limites'
        statusColor = 'var(--danger)'
        subInfo = 'Medição irregular nas últimas 24h'
        glow = `0 0 8px ${alpha('var(--danger)', 0.4)}`
      } else if (p.status === 'WARNING') {
        statusLabel = 'Sem Medição'
        statusColor = 'var(--warn)'
        subInfo = 'Nenhuma leitura nas últimas 24h'
        glow = `0 0 8px ${alpha('var(--warn)', 0.3)}`
      }

      return (
        <div
          key={p.id}
          onClick={() => handlePointClick(p.id)}
          style={{
            background: 'var(--s2)',
            border: `1px solid ${p.status === 'DANGER' ? alpha('var(--danger)', 0.4) : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: p.status === 'DANGER' ? glow : 'none',
            transition: 'all 0.2s ease',
          }}
          className="hover:scale-[1.02] hover:bg-[var(--s3)]"
        >
          {/* Type Icon */}
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusColor,
              flexShrink: 0
            }}
          >
            {getPointIcon(p.name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: statusColor, 
                  boxShadow: p.status === 'DANGER' ? '0 0 6px var(--danger)' : 'none',
                  flexShrink: 0 
                }} 
                className={p.status === 'DANGER' ? 'animate-pulse' : ''}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>
                {subInfo}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: F.mono, color: statusColor, textTransform: 'uppercase' }}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      )
    })

    const hint = 'Clique em um ponto para abrir o histórico detalhado →'
    const body = (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">{cards}</div>
        <div style={{ marginTop: '14px', fontSize: '11.5px', color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon('M13 2 3 14h9l-1 8 10-12h-9l1-8z', 13, 'var(--brand)')}
          {hint}
        </div>
      </div>
    )
    return cardFrame('Pontos de Coleta', 'Monitoramento operacional em tempo real', null, body, 'Planta')
  }

  // Removed renderDrawer as per Option B



  // KPI cards renderer
  const renderKpis = () => {
    const confValue = dbConfCurrent !== null ? `${dbConfCurrent.toFixed(1)}%` : '—'
    const confDeltaVal = dbConfDelta !== null ? dbConfDelta : null

    const kpis = [
      {
        title: 'Registros Hoje',
        val: dbTotalRegistersToday,
        delta: dbRegistersDelta,
        label: 'vs ontem',
        href: '/gestor/leituras',
        spark: dbSparklineData.length > 0 ? dbSparklineData : null,
        alert: false,
      },
      {
        title: 'Ocorrências Abertas',
        val: dbOpenOccurrences,
        delta: null,
        label: '',
        href: '/gestor/ocorrencias',
        spark: null,
        alert: dbOpenOccurrences > 0,
      },
      {
        title: 'Coletas Pendentes Hoje',
        val: Math.max(0, (dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled) - (dbProgress.field.done + dbProgress.internal.done + dbProgress.external.done)),
        delta: null,
        label: `de ${dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled} agendadas`,
        href: null,
        spark: null,
        alert: Math.max(0, (dbProgress.field.scheduled + dbProgress.internal.scheduled + dbProgress.external.scheduled) - (dbProgress.field.done + dbProgress.internal.done + dbProgress.external.done)) > 0,
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
    const selectedTitle = dbSelectedParam?.name || 'Parâmetro'
    if (dbTrendData.length === 0) return cardFrame(`Tendência de ${selectedTitle}`, 'Sem leituras no período', null, emptyState('trend'))
    let series = dbTrendData.map((d) => d.value)

    const dropdown = (
      <ParamSelector parameters={dbParameters} defaultValue={paramId || (dbParameters[0]?.id)} diasNum={diasNum} />
    )

    const unitStr = dbSelectedParam?.unit ? ` ${dbSelectedParam.unit}` : ''
    const minLimit = dbSelectedParam?.min_limit
    const maxLimit = dbSelectedParam?.max_limit
    let limitStr = 'Sem limites definidos'
    if (minLimit !== null && maxLimit !== null) {
      limitStr = `Faixa CONAMA (${minLimit.toFixed(1)}–${maxLimit.toFixed(1)}${unitStr})`
    } else if (maxLimit !== null) {
      limitStr = `Limite Máximo CONAMA (${maxLimit.toFixed(1)}${unitStr})`
    } else if (minLimit !== null) {
      limitStr = `Limite Mínimo CONAMA (${minLimit.toFixed(1)}${unitStr})`
    }

    return cardFrame(
      `Tendência de ${selectedTitle}`,
      `${limitStr} · ${diasNum} ${diasNum === 1 ? 'dia' : 'dias'}`,
      dropdown,
      <div style={{ marginTop: '10px' }}>{buildTrend(series, false)}</div>,
      'SMM'
    )
  }

  // Consumption stacked chart widget
  const renderConsumption = () => {
    if (dbChemicalConsumptionData.length === 0) return cardFrame('Consumo químico', 'Os lançamentos aparecerão aqui', null, emptyState('consumption'))
    return cardFrame('Consumo químico', 'Lançamento acumulado por reagente · 7 dias', null, buildConsumption(), 'Estoque')
  }


  // Occurrences Severity donut chart widget
  const renderOccurrencesWidget = () => {
    const list = dbCriticalOccurrences.map((o, i) => {
      let col = 'var(--txt3)'
      if (o.severity === 'CRITICAL') col = 'var(--danger)'
      else if (o.severity === 'HIGH') col = 'var(--warn)'
      else if (o.severity === 'MEDIUM') col = 'var(--brand)'
      else if (o.severity === 'LOW') col = '#64748b'

      const dateStr = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const timeStr = new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      return (
        <div 
          key={i} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px', 
            background: 'var(--s2)',
            border: `1px solid ${o.severity === 'CRITICAL' ? alpha('var(--danger)', 0.2) : 'var(--border)'}`,
            borderRadius: '10px',
            marginBottom: '8px'
          }}
        >
          {/* Severity bar */}
          <span 
            style={{ 
              width: '4px', 
              height: '36px',
              borderRadius: '2px', 
              background: col, 
              flex: 'none' 
            }} 
            className={o.severity === 'CRITICAL' ? 'animate-pulse' : ''}
          />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.description || 'Sem descrição'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>
              {o.collection_point?.name ? `Ponto: ${o.collection_point.name} · ` : ''}Abertura: {dateStr} às {timeStr}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                fontFamily: F.mono,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: col,
                background: alpha(col, 0.12),
                padding: '2px 8px',
                borderRadius: '6px',
                flex: 'none',
              }}
            >
              {o.severity === 'CRITICAL' ? 'Crítica' : o.severity === 'HIGH' ? 'Alta' : o.severity === 'MEDIUM' ? 'Média' : 'Baixa'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--txt3)' }}>
              Status: {o.status === 'OPEN' ? 'Aberta' : 'Em progresso'}
            </span>
          </div>
        </div>
      )
    })

    const body = (
      <div>
        {dbCriticalOccurrences.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ok-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              {icon('M5 13l4 4L19 7', 20, 'var(--ok)')}
            </div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--txt)' }}>Nenhum alerta ativo</div>
            <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '2px' }}>ETE operando em plena conformidade.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '310px', overflowY: 'auto' }}>
            {list}
          </div>
        )}
      </div>
    )
    return cardFrame('Alertas Ativos', 'Ocorrências operacionais em aberto', null, body, 'Operação')
  }

  // Real-time timeline feed widget
  const renderFeedWidget = () => {
    if (dbFeed.length === 0) return cardFrame('Atividades recentes', 'Linha do tempo da ETE', null, miniEmpty('Sem atividades registradas hoje.'), 'Tempo real')
    const typeCol = { ok: 'var(--ok)', chem: 'var(--brand)', reading: 'var(--brand)', alert: 'var(--danger)', shift: 'var(--txt3)' }
    const items = dbFeed.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: '12px' }}>
        <span style={{ fontFamily: F.mono, fontSize: '11px', color: 'var(--txt3)', width: '40px', flex: 'none', textAlign: 'right', paddingTop: '1px' }}>
          {it.time}
        </span>
        <div style={{ position: 'relative', width: '14px', flex: 'none', display: 'flex', justifyContent: 'center' }}>
          {i < dbFeed.length - 1 && <span style={{ position: 'absolute', top: '14px', bottom: '-6px', width: '2px', background: 'var(--border)' }} />}
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

  // Maintenance Widget
  const renderMaintenanceWidget = () => {
    if (dbMaintenance.length === 0) {
      return cardFrame(
        'Manutenção Preventiva', 
        'Próximos 30 dias', 
        null, 
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ok-soft)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '10px' }}>
            {icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 20, 'var(--ok)')}
          </div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--txt)' }}>Tudo em ordem</div>
          <div style={{ fontSize: '11.5px', color: 'var(--txt3)', marginTop: '2px' }}>Sem manutenções preventivas nos próximos 30 dias.</div>
        </div>, 
        'Ativos'
      )
    }
    
    const rows = dbMaintenance.map((m, i) => {
      let col = 'var(--ok)'
      let bg = 'var(--ok-soft)'
      let daysText = `${m.days}d`
      let alertStyle: React.CSSProperties = {}

      if (m.days <= 7) {
        col = 'var(--danger)'
        bg = 'var(--danger-soft)'
        daysText = m.days < 0 ? 'Atrasada' : m.days === 0 ? 'Hoje' : `${m.days} dias`
        if (m.days <= 0) {
          alertStyle = { animation: 'pulse 2s infinite' }
        }
      } else if (m.days <= 15) {
        col = 'var(--warn)'
        bg = 'var(--warn-soft)'
        daysText = `${m.days} dias`
      } else {
        col = 'var(--ok)'
        bg = 'var(--ok-soft)'
        daysText = `${m.days} dias`
      }

      const formattedSchedDate = new Date(m.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

      return (
        <div 
          key={i} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 0', 
            borderTop: i ? '1px solid var(--border)' : 'none' 
          }}
        >
          {/* Mini settings/wrench icon */}
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--txt3)',
              flexShrink: 0
            }}
          >
            {icon('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z', 16, 'var(--txt2)')}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>
              Agendado: {formattedSchedDate}
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: F.mono,
              color: col,
              background: bg,
              padding: '4px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              ...alertStyle
            }}
          >
            {daysText}
          </span>
        </div>
      )
    })

    return cardFrame('Manutenção Preventiva', 'Próximos 30 dias', null, <div style={{ display: 'flex', flexDirection: 'column' }}>{rows}</div>, 'Ativos')
  }


  const renderAnalysesStatusWidget = () => {
    const pField = dbProgress.field
    const pInternal = dbProgress.internal
    const pExternal = dbProgress.external

    const fieldPct = pField.scheduled > 0 ? Math.round((pField.done / pField.scheduled) * 100) : 0
    const internalPct = pInternal.scheduled > 0 ? Math.round((pInternal.done / pInternal.scheduled) * 100) : 0
    const externalPct = pExternal.scheduled > 0 ? Math.round((pExternal.done / pExternal.scheduled) * 100) : 0

    return cardFrame(
      'Progresso Analítico',
      'Atividades Executadas Hoje',
      null,
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Coletas de Campo</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pField.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--brand)' }}>{pField.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: fieldPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{fieldPct}%</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Análises Internas (Técnico)</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pInternal.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--warn)' }}>{pInternal.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: internalPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{internalPct}%</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Laudos Externos</span>
            <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>Agendado: {pExternal.scheduled}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 600, color: 'var(--ok)' }}>{pExternal.done}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: externalPct === 100 ? 'var(--ok)' : 'var(--txt3)', width: '32px', textAlign: 'right' }}>{externalPct}%</span>
          </div>
        </div>
      </div>,
      'Execução'
    )
  }

  const renderEteStatusWidget = () => {
    const statusMap = {
      OK: {
        col: 'var(--ok)',
        bg: 'var(--ok-soft)',
        title: 'Operação Normal',
        desc: 'Todos os parâmetros monitorados estão dentro da conformidade legal.',
        iconD: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      },
      WARNING: {
        col: 'var(--warn)',
        bg: 'var(--warn-soft)',
        title: 'Operação em Atenção',
        desc: 'Desvio detectado ou ocorrência operacional sob análise.',
        iconD: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      },
      DANGER: {
        col: 'var(--danger)',
        bg: 'var(--danger-soft)',
        title: 'Operação Crítica',
        desc: 'Ocorrência de gravidade crítica em aberto. Requer intervenção imediata.',
        iconD: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      }
    }

    const currentStatus = statusMap[eteStatus]

    // Formatar data da última leitura
    const lastReadingTime = absoluteLatestReading 
      ? new Date(absoluteLatestReading.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '—'

    return (
      <div 
        style={{
          background: 'var(--s1)',
          border: `1px solid var(--border)`,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '190px'
        }}
      >
        {/* Glow de fundo correspondente ao status */}
        <div 
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: currentStatus.col,
            filter: 'blur(70px)',
            opacity: 0.15,
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Ícone de Status Grande */}
          <div 
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: currentStatus.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {icon(currentStatus.iconD, 24, currentStatus.col)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontFamily: F.mono, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
              Status Geral da ETE
            </div>
            <h3 style={{ fontFamily: F.sora, fontSize: '18px', fontWeight: 700, margin: '4px 0 2px', color: 'var(--txt)' }}>
              {currentStatus.title}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--txt2)', margin: 0, lineHeight: 1.4 }}>
              {currentStatus.desc}
            </p>
          </div>
        </div>

        {/* Informações detalhadas do plantão e leituras */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: F.mono, color: 'var(--txt3)', textTransform: 'uppercase' }}>
              Operador de Plantão
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {icon('M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 11-8 0 4 4 0 018 0z', 13, 'var(--brand)')}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {activeOperatorName ? `${activeOperatorName} (${activeShiftName || 'Turno'})` : 'Nenhum plantonista'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', fontFamily: F.mono, color: 'var(--txt3)', textTransform: 'uppercase' }}>
              Último Registro
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: absoluteLatestReading?.isNonConformant ? 'var(--danger)' : 'var(--txt)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {icon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 13, absoluteLatestReading?.isNonConformant ? 'var(--danger)' : 'var(--txt3)')}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {absoluteLatestReading ? `${absoluteLatestReading.parameterName} (${lastReadingTime})` : 'Sem registros'}
              </span>
            </div>
          </div>
        </div>

        {/* Desvio do dia se houver */}
        {latestNCToday && (
          <div 
            style={{
              marginTop: '12px',
              background: alpha('var(--danger)', 0.08),
              border: `1px solid ${alpha('var(--danger)', 0.2)}`,
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 13, 'var(--danger)')}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Fora dos Limites: {latestNCToday.parameterName} às {new Date(latestNCToday.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} no ponto {latestNCToday.pointName} ({latestNCToday.value} {latestNCToday.unit})
            </span>
          </div>
        )}
      </div>
    )
  }

  const renderQuickActions = () => {
    return (
      <div 
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '190px'
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontFamily: F.mono, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
            Ações Rápidas
          </div>
          <h3 style={{ fontFamily: F.sora, fontSize: '16px', fontWeight: 600, margin: '4px 0 12px', color: 'var(--txt)' }}>
            Atalhos Operacionais
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => {
              setModalCollectionPointId('')
              setModalParameterId('')
              setModalValue('')
              setModalUnit('')
              setModalNotes('')
              setIsReadingModalOpen(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--brand)',
              color: 'var(--on-brand)',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: F.body,
              transition: 'transform 0.15s, opacity 0.15s',
            }}
            className="hover:scale-[1.01] hover:opacity-95 active:scale-[0.99]"
          >
            {icon('M12 4v16m8-8H4', 16, 'var(--on-brand)')}
            Lançar Nova Leitura
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Link
              href="/gestor/ocorrencias/nova"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--s2)',
                color: 'var(--txt)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '11px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                fontFamily: F.body,
                transition: 'background-color 0.2s, transform 0.15s',
              }}
              className="hover:bg-[var(--s3)] hover:scale-[1.01]"
            >
              {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 15, 'var(--txt)')}
              Ocorrência
            </Link>

            <button
              onClick={() => showToast('Relatório operacional do dia compilado com sucesso!', 'success')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--s2)',
                color: 'var(--txt)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '11px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: F.body,
                transition: 'background-color 0.2s, transform 0.15s',
              }}
              className="hover:bg-[var(--s3)] hover:scale-[1.01]"
            >
              {icon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 15, 'var(--txt)')}
              Relatório PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderPointDrawer = () => {
    if (!isDrawerOpen) return null

    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.2s',
        }}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '460px',
            height: '100%',
            background: 'var(--s1)',
            borderLeft: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '10px', fontFamily: F.mono, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--brand)' }}>
                Detalhes do Ponto
              </span>
              <h2 style={{ fontFamily: F.sora, fontSize: '20px', fontWeight: 700, color: 'var(--txt)', margin: '4px 0 0' }}>
                {drawerLoading ? 'Carregando...' : drawerData?.ponto.name}
              </h2>
              {!drawerLoading && drawerData?.ponto.location && (
                <p style={{ fontSize: '12px', color: 'var(--txt3)', margin: '4px 0 0' }}>
                  Local: {drawerData.ponto.location}
                </p>
              )}
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: '4px' }}
            >
              {icon('M6 18L18 6M6 6l12 12', 20, 'var(--txt3)')}
            </button>
          </div>

          {drawerLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3 text-slate-400">
              <span className="w-6 h-6 border-2 border-t-brand border-slate-700 rounded-full animate-spin" />
              <span>Buscando histórico...</span>
            </div>
          ) : drawerError ? (
            <div className="text-center py-12 text-red-400 text-sm">
              {drawerError}
            </div>
          ) : drawerData ? (
            <>
              {/* Status Badge */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: drawerData.statusConformidade === 'DANGER' ? alpha('var(--danger)', 0.1) : alpha('var(--ok)', 0.1),
                  border: `1px solid ${drawerData.statusConformidade === 'DANGER' ? alpha('var(--danger)', 0.3) : alpha('var(--ok)', 0.3)}`,
                  padding: '12px 16px',
                  borderRadius: '10px',
                }}
              >
                <span 
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: drawerData.statusConformidade === 'DANGER' ? 'var(--danger)' : 'var(--ok)',
                    boxShadow: drawerData.statusConformidade === 'DANGER' ? '0 0 8px var(--danger)' : 'none',
                  }}
                  className={drawerData.statusConformidade === 'DANGER' ? 'animate-pulse' : ''}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--txt)' }}>
                    {drawerData.statusConformidade === 'DANGER' ? 'Ocorrências ou Desvios Detectados' : 'Ponto em Conformidade'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--txt3)' }}>
                    {drawerData.statusConformidade === 'DANGER' ? 'Medições fora dos limites nas últimas 24h' : 'Todas as últimas medições dentro da faixa legal'}
                  </span>
                </div>
              </div>

              {/* Sparkline / Trend */}
              {drawerData.sparklineData.length > 0 && (
                <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontFamily: F.mono, textTransform: 'uppercase', color: 'var(--txt3)', marginBottom: '8px' }}>
                    Tendência Recente de {drawerData.parameterName}
                  </div>
                  <div style={{ height: '80px', marginTop: '10px' }}>
                    {buildSpark(drawerData.sparklineData.map((d: any) => d.value), 'var(--brand)')}
                  </div>
                  {drawerData.limits.max !== null || drawerData.limits.min !== null ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--txt3)', marginTop: '8px', fontFamily: F.mono }}>
                      {drawerData.limits.min !== null && <span>Mín: {drawerData.limits.min}</span>}
                      {drawerData.limits.max !== null && <span>Máx: {drawerData.limits.max}</span>}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Last 5 readings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '11px', fontFamily: F.mono, textTransform: 'uppercase', color: 'var(--txt3)' }}>
                  Últimos 5 Lançamentos (Campo & Lab)
                </span>
                
                {drawerData.leituras.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12.5px', color: 'var(--txt3)' }}>
                    Nenhum registro encontrado para este ponto.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerData.leituras.map((l: any) => {
                      const limitColor = l.is_non_conformant ? 'var(--danger)' : 'var(--txt2)'
                      const limitBg = l.is_non_conformant ? alpha('var(--danger)', 0.1) : 'transparent'
                      const limitBorder = l.is_non_conformant ? `1px solid ${alpha('var(--danger)', 0.3)}` : 'none'

                      return (
                        <div 
                          key={l.id}
                          style={{
                            background: l.is_non_conformant ? limitBg : 'var(--s2)',
                            border: l.is_non_conformant ? limitBorder : '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontFamily: F.mono, color: 'var(--txt3)' }}>
                              {l.tipo} · {new Date(l.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {l.is_non_conformant && (
                              <span 
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  fontFamily: F.mono,
                                  color: 'var(--danger)',
                                  background: alpha('var(--danger)', 0.15),
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                Fora Limite
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)' }}>
                              {l.parameter?.name || 'Parâmetro'}
                            </span>
                            <span style={{ fontFamily: F.mono, fontSize: '14px', fontWeight: 700, color: limitColor }}>
                              {l.value !== null ? `${l.value} ${l.unit || ''}` : '—'}
                            </span>
                          </div>

                          {l.notes && (
                            <p style={{ fontSize: '11.5px', color: 'var(--txt3)', margin: '4px 0 0', fontStyle: 'italic' }}>
                              " {l.notes} "
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Drawer footer CTA */}
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    setModalCollectionPointId(drawerData.ponto.id)
                    setModalParameterId('')
                    setModalValue('')
                    setModalUnit('')
                    setModalNotes('')
                    setIsDrawerOpen(false)
                    setIsReadingModalOpen(true)
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--brand)',
                    color: 'var(--on-brand)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: F.body,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {icon('M12 4v16m8-8H4', 16, 'var(--on-brand)')}
                  Nova Leitura de Campo
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  const renderReadingModal = () => {
    if (!isReadingModalOpen) return null

    const selectedParamObj = dbParameters.find(p => p.id === modalParameterId)
    const isModalValueNonConformant = selectedParamObj && modalValue !== '' && (
      (selectedParamObj.min_limit !== undefined && selectedParamObj.min_limit !== null && Number(modalValue) < selectedParamObj.min_limit) ||
      (selectedParamObj.max_limit !== undefined && selectedParamObj.max_limit !== null && Number(modalValue) > selectedParamObj.max_limit)
    )

    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          padding: '16px',
        }}
        onClick={() => setIsReadingModalOpen(false)}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '480px',
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontFamily: F.sora, fontSize: '18px', fontWeight: 700, color: 'var(--txt)', margin: 0 }}>
                Registrar Leitura de Campo
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--txt3)', margin: '4px 0 0' }}>
                Lançamento rápido direto no banco operacional.
              </p>
            </div>
            <button 
              onClick={() => setIsReadingModalOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: '4px' }}
            >
              {icon('M6 18L18 6M6 6l12 12', 20, 'var(--txt3)')}
            </button>
          </div>

          {modalSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-emerald-400">
              <span className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                {icon('M5 13l4 4L19 7', 24, 'var(--ok)')}
              </span>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Leitura registrada com sucesso!</span>
            </div>
          ) : (
            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modalError && (
                <div style={{ background: alpha('var(--danger)', 0.1), border: `1px solid ${alpha('var(--danger)', 0.3)}`, color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                  {modalError}
                </div>
              )}

              {/* Collection Point */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Ponto de Coleta
                </label>
                <select
                  required
                  value={modalCollectionPointId}
                  onChange={(e) => setModalCollectionPointId(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                >
                  <option value="">Selecione o Ponto de Coleta</option>
                  {dbHeatmapPoints.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Parameter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Parâmetro
                </label>
                <select
                  value={modalParameterId}
                  onChange={(e) => handleParameterChange(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                >
                  <option value="">Sem parâmetro (apenas observação)</option>
                  {dbParameters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {modalParameterId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                  {/* Value */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                      Valor Medido
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      inputMode="decimal"
                      value={modalValue}
                      onChange={(e) => setModalValue(e.target.value)}
                      style={{
                        background: 'var(--s2)',
                        border: `1px solid ${isModalValueNonConformant ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        color: 'var(--txt)',
                        fontSize: '13px',
                        padding: '8px 12px',
                        fontFamily: F.body,
                        outline: 'none',
                        boxShadow: isModalValueNonConformant ? `0 0 4px ${alpha('var(--danger)', 0.4)}` : 'none',
                      }}
                      placeholder="Ex: 7.2"
                    />
                  </div>

                  {/* Unit */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                      Unidade
                    </label>
                    <input
                      type="text"
                      value={modalUnit}
                      onChange={(e) => setModalUnit(e.target.value)}
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--txt)',
                        fontSize: '13px',
                        padding: '8px 12px',
                        fontFamily: F.body,
                        outline: 'none',
                      }}
                      placeholder="Ex: mg/L"
                    />
                  </div>
                </div>
              )}

              {/* Real-time Nonconformity Alert */}
              {isModalValueNonConformant && selectedParamObj && (
                <div style={{ color: 'var(--danger)', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                  {icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 14, 'var(--danger)')}
                  <span>
                    Fora do limite CONAMA: {selectedParamObj.min_limit !== undefined && selectedParamObj.min_limit !== null ? selectedParamObj.min_limit.toFixed(1) : '0'} a {selectedParamObj.max_limit !== undefined && selectedParamObj.max_limit !== null ? selectedParamObj.max_limit.toFixed(1) : '∞'} {selectedParamObj.unit}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Observações
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  autoComplete="off"
                  rows={2}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="Observações operacionais (opcional)"
                />
              </div>

              {/* Recorded At */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--txt2)', fontFamily: F.mono, textTransform: 'uppercase' }}>
                  Data/Hora da Leitura
                </label>
                <input
                  type="datetime-local"
                  required
                  value={modalRecordedAt}
                  onChange={(e) => setModalRecordedAt(e.target.value)}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--txt)',
                    fontSize: '13px',
                    padding: '8px 12px',
                    fontFamily: F.body,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsReadingModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: 'var(--txt)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    background: 'var(--brand)',
                    color: 'var(--on-brand)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
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

        {/* Top Control Grid: ETE Status + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[18px]">
          {renderEteStatusWidget()}
          {renderQuickActions()}
        </div>

        {/* Banner de filtro */}
        {activePointName && (
          <div style={{ background: alpha('var(--brand)', 0.1), border: '1px solid ' + alpha('var(--brand)', 0.3), padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {icon('M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z', 16, 'var(--brand)')}
              <span style={{ fontSize: '13px', color: 'var(--txt)' }}>Filtrando o painel por <strong style={{ fontWeight: 600 }}>{activePointName}</strong></span>
            </div>
            <Link 
              href={`/gestor/dashboard?dias=${diasNum}${paramId ? `&paramId=${paramId}` : ''}`}
              style={{ fontSize: '12px', color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}
            >
              Limpar filtro
            </Link>
          </div>
        )}

        {/* Row 1: KPIs */}
        {renderKpis()}

        {/* Row 2: Charts */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr_1fr] gap-[18px] items-start">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderTrend()}
            {renderConsumption()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {renderPoints()}
            {renderOccurrencesWidget()}
          </div>
        </div>

        {/* Row 3: Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', paddingBottom: '40px' }}>
          {renderAnalysesStatusWidget()}
          {renderFeedWidget()}
          {renderMaintenanceWidget()}
        </div>
      </main>
      
      {/* Modals & Drawer overlay */}
      {renderPointDrawer()}
      {renderReadingModal()}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: toastMessage.type === 'success' ? 'var(--ok)' : toastMessage.type === 'error' ? 'var(--danger)' : 'var(--brand)',
            color: 'var(--on-brand)',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.type === 'success' && icon('M5 13l4 4L19 7', 16, 'currentColor')}
          {toastMessage.type === 'error' && icon('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', 16, 'currentColor')}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  )
}
