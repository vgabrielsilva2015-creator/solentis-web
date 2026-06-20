'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts'

export interface TrendChartData {
  time: string
  value: number
  minLimit: number | null
  maxLimit: number | null
  laboratoryType?: string
}

interface TrendChartProps {
  data: TrendChartData[]
  parameterName: string
  unit: string
}

export function TrendChart({ data, parameterName, unit }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-800">
        <p className="text-sm text-slate-500">Sem histórico para exibir no período.</p>
      </div>
    )
  }

  // Pegamos os limites do primeiro ponto válido (assumindo que não mudou no curto período plotado)
  const firstValid = data.find(d => d.minLimit !== null || d.maxLimit !== null)
  const minLimit = firstValid?.minLimit ?? null
  const maxLimit = firstValid?.maxLimit ?? null

  const hasMin = minLimit !== null
  const hasMax = maxLimit !== null

  // Para garantir que o eixo Y comporte a reference area "infinita" vermelha
  const dataMax = Math.max(...data.map(d => d.value))
  const dataMin = Math.min(...data.map(d => d.value))
  
  // Customização do YAxis domain para ter margem
  const yAxisDomain = (dataMinMax: any) => {
    let min = dataMinMax[0] as number
    let max = dataMinMax[1] as number
    if (hasMax && max < maxLimit! * 1.2) max = maxLimit! * 1.2
    if (hasMin && min > minLimit! * 0.8) min = minLimit! * 0.8
    if (max === min) {
       max += 10
       min = Math.max(0, min - 10)
    }
    return [Math.floor(min), Math.ceil(max)]
  }

  return (
    <div className="h-72 w-full flex flex-col">
      <div className="flex justify-end gap-3 px-2 text-[10px] text-slate-400 mb-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-slate-300 bg-slate-900 inline-block" /> Análise Interna</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-blue-400 bg-blue-500 inline-block" /> Laudo Externo</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand, #14b8a6)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-brand, #14b8a6)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-800)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--color-slate-500)" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="var(--color-slate-500)" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            domain={yAxisDomain as any}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-slate-900)', borderColor: 'var(--color-slate-700)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--color-slate-200)', fontWeight: 500 }}
            labelStyle={{ color: 'var(--color-slate-400)', marginBottom: '4px' }}
            formatter={(val: any, name: any, props: any) => {
              const labType = props.payload.laboratoryType === 'EXTERNAL' ? '(Externo)' : '(Interno)'
              return [`${val} ${unit} ${labType}`, parameterName]
            }}
          />

          {/* Cenário 1: Tem Min e Max (ex: pH) -> Faixa Permitida é Verde Clara entre eles */}
          {hasMin && hasMax && (
            <ReferenceArea
              y1={minLimit}
              y2={maxLimit}
              fill="var(--color-status-ok, #10b981)"
              fillOpacity={0.07}
            />
          )}

          {/* Cenário 2: Tem só Max (ex: Turbidez) -> Faixa Proibida Vermelha acima do Max */}
          {!hasMin && hasMax && (
            <>
              <ReferenceArea
                y1={maxLimit}
                // não definimos y2 para ir "até o infinito" visual do eixo
                fill="var(--color-status-danger)"
                fillOpacity={0.07}
              />
              <ReferenceLine y={maxLimit} stroke="var(--color-status-danger)" strokeDasharray="3 3" opacity={0.5} />
            </>
          )}

          {/* Cenário 3: Tem só Min -> Faixa Proibida Vermelha abaixo do Min */}
          {hasMin && !hasMax && (
            <>
              <ReferenceArea
                y2={minLimit}
                fill="var(--color-status-danger)"
                fillOpacity={0.07}
              />
              <ReferenceLine y={minLimit} stroke="var(--color-status-danger)" strokeDasharray="3 3" opacity={0.5} />
            </>
          )}

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand, #14b8a6)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBrand)"
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (!cx || !cy) return <g key={`dot-${props.key}`} />
              const isExternal = payload.laboratoryType === 'EXTERNAL'
              return (
                <circle
                  key={`dot-${props.key}`}
                  cx={cx}
                  cy={cy}
                  r={isExternal ? 5 : 3}
                  fill={isExternal ? '#3b82f6' : 'var(--color-slate-900)'}
                  stroke={isExternal ? '#60a5fa' : 'var(--color-brand, #14b8a6)'}
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 5, fill: 'var(--color-accent)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
