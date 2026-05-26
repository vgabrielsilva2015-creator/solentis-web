'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type DataPoint = { paramName: string; count: number }

export function NonConformChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-500">
        Nenhuma não-conformidade no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

        <XAxis
          dataKey="paramName"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />

        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />

        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [v, 'Não-conformidades']}
        />

        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#ef4444' : '#f97316'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
