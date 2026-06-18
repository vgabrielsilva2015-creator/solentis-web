import Link from 'next/link'
import React from 'react'

export type PointStatus = 'OK' | 'WARNING' | 'DANGER'

export interface HeatmapPoint {
  id: string
  name: string
  status: PointStatus
}

interface StatusHeatmapProps {
  points: HeatmapPoint[]
}

const STATUS_CONFIG: Record<PointStatus, { color: string; label: string; dot: string }> = {
  OK:      { color: 'text-status-ok',      label: 'OK',      dot: 'bg-status-ok' },
  WARNING: { color: 'text-status-warn',    label: 'Atenção', dot: 'bg-status-warn' },
  DANGER:  { color: 'text-status-danger',  label: 'Fora',    dot: 'bg-status-danger' },
}

export function StatusHeatmap({ points }: StatusHeatmapProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-800">
        <p className="text-sm text-slate-500">Nenhum ponto de coleta</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {points.map((point) => {
        const config = STATUS_CONFIG[point.status]
        return (
          <div
            key={point.id}
            className="group flex flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <span className="truncate text-xs font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
              {point.name}
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              <span className={`text-[10px] font-semibold tracking-wider uppercase ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
