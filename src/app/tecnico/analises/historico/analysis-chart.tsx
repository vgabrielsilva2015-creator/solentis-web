'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'

type DataPoint = {
  date:            string
  value:           number
  isNonConformant: boolean
}

type Props = {
  data:     DataPoint[]
  unit:     string
  minLimit: number | null
  maxLimit: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props
  const fill = payload.isNonConformant ? '#f87171' : '#60a5fa'
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />
}

export function AnalysisChart({ data, unit, minLimit, maxLimit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          width={40}
          unit={` ${unit}`}
        />

        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={(v) => formatDate(String(v))}
          formatter={(v) => [`${v} ${unit}`, 'Valor']}
        />

        {minLimit !== null && (
          <ReferenceLine
            y={minLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `mín ${minLimit}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        {maxLimit !== null && (
          <ReferenceLine
            y={maxLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `máx ${maxLimit}`, position: 'insideBottomLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
