'use client'

import React from 'react'
import { F, activeVars, alpha, cardFrame, miniEmpty, icon } from './ui-helpers'
import { ParamSelector } from '../param-selector'
import { PointSelector } from '../point-selector'
import Link from 'next/link'

interface TrendBlockProps {
  dbTrendData: any[]
  dbSelectedParam: any
  dbParameters: any[]
  dbHeatmapPoints: any[]
  dbChemicalConsumptionData: any[]
  diasNum: number
  paramId?: string
  pontoId?: string
  activePointName?: string | null
  onOpenReadingModal: () => void
}

export function TrendBlock({
  dbTrendData,
  dbSelectedParam,
  dbParameters,
  dbHeatmapPoints,
  dbChemicalConsumptionData,
  diasNum,
  paramId,
  pontoId,
  activePointName,
  onOpenReadingModal
}: TrendBlockProps) {

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
          {kind === 'trend' ? (
            <button onClick={onOpenReadingModal} style={{ background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: '9px', padding: '9px 15px', fontSize: '12.5px', fontWeight: 600, fontFamily: F.body, cursor: 'pointer' }}>
              {m.cta}
            </button>
          ) : (
            <Link href="/gestor/produtos-quimicos" style={{ background: 'var(--brand)', color: 'var(--on-brand)', border: 'none', borderRadius: '9px', padding: '9px 15px', fontSize: '12.5px', fontWeight: 600, fontFamily: F.body, cursor: 'pointer', textDecoration: 'none' }}>
              {m.cta}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const buildTrend = (series: number[], small: boolean) => {
    const W = 680
    const H = small ? 150 : 230
    const pl = 40
    const pr = 12
    const pt = 14
    const pb = 24
    
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

    const steps = 5
    const gridVals: number[] = []
    for (let i = 0; i < steps; i++) {
      gridVals.push(min + (i * (max - min)) / (steps - 1))
    }

    const grid = gridVals.map((v, idx) => (
      <g key={idx}>
        <line x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={pl - 7} y={Y(v) + 3} textAnchor="end" fontFamily={F.mono} fontSize={12} fill="var(--txt3)">
          {v.toFixed(1)}
        </text>
      </g>
    ))

    const limitLines = (
      <>
        {paramMin !== null && (
          <g>
            <line x1={pl} y1={Y(paramMin)} x2={W - pr} y2={Y(paramMin)} stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={W - pr - 5} y={Y(paramMin) - 4} textAnchor="end" fontFamily={F.mono} fontSize={13} fill="var(--warn)">
              Min: {paramMin.toFixed(1)}
            </text>
          </g>
        )}
        {paramMax !== null && (
          <g>
            <line x1={pl} y1={Y(paramMax)} x2={W - pr} y2={Y(paramMax)} stroke="var(--danger)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={W - pr - 5} y={Y(paramMax) - 4} textAnchor="end" fontFamily={F.mono} fontSize={13} fill="var(--danger)">
              Max: {paramMax.toFixed(1)}
            </text>
          </g>
        )}
      </>
    )

    const xlabels = dbTrendData.map((d, i) => {
      const showLabel = n <= 7 || i === 0 || i === n - 1 || (n <= 15 && i % 2 === 0) || (n <= 30 && i % 5 === 0) || (i % 10 === 0)
      if (!showLabel) return null
      return (
        <text key={i} x={X(i)} y={H - 7} textAnchor="middle" fontFamily={F.mono} fontSize={13} fill="var(--txt3)">
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
        {paramMin !== null && paramMax !== null && (
          <rect x={pl} y={Y(paramMax)} width={W - pl - pr} height={Y(paramMin) - Y(paramMax)} fill={alpha('var(--ok)', 0.05)} />
        )}
        {grid}
        {limitLines}
        <path d={area} fill="url(#gtrend)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
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

  const selectedTitle = dbSelectedParam?.name || 'Parâmetro'
  const pointLabel = pontoId && activePointName ? activePointName : 'Todos os pontos'

  const dropdown = (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <ParamSelector parameters={dbParameters} defaultValue={paramId || (dbParameters[0]?.id)} diasNum={diasNum} />
      <PointSelector points={dbHeatmapPoints} pontoId={pontoId} />
    </div>
  )

  const mixingNote = !pontoId ? (
    <p style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '8px', lineHeight: 1.4 }}>
      Mostrando <strong>todos os pontos juntos</strong> — os valores podem variar muito entre pontos
      (ex.: pH na entrada × na saída). Selecione um ponto acima para uma leitura limpa.
    </p>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      {dbTrendData.length === 0 ? (
        cardFrame(`Tendência de ${selectedTitle}`, `${pointLabel} · sem leituras no período`, dropdown, emptyState('trend'), 'SMM')
      ) : (
        cardFrame(
          `Tendência de ${selectedTitle}${pontoId && activePointName ? ` · ${activePointName}` : ''}`,
          `${dbSelectedParam?.min_limit !== null && dbSelectedParam?.max_limit !== null ? `Faixa CONAMA (${dbSelectedParam?.min_limit?.toFixed(1)}–${dbSelectedParam?.max_limit?.toFixed(1)}${dbSelectedParam?.unit ? ` ${dbSelectedParam.unit}` : ''})` : 'Sem limites definidos'} · ${diasNum} ${diasNum === 1 ? 'dia' : 'dias'} · ${pointLabel}`,
          dropdown,
          <div style={{ marginTop: '10px' }}>{buildTrend(dbTrendData.map(d => d.value), false)}{mixingNote}</div>,
          'SMM'
        )
      )}
      {cardFrame('Consumo químico', 'Lançamento acumulado por reagente · 7 dias', null, buildConsumption(), 'Estoque')}
    </div>
  )
}
