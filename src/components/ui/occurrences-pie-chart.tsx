'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

export type OccurrencesData = {
  name: string
  value: number
  color: string
}

export function OccurrencesPieChart({ data }: { data: OccurrencesData[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Nenhuma ocorrência registrada no período.
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2 rounded shadow-xl text-sm">
          <p className="text-slate-300 font-medium">{payload[0].name}</p>
          <p className="font-bold" style={{ color: payload[0].payload.color }}>
            {payload[0].value} ocorrência(s)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
