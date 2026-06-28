'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface PointSelectorProps {
  points: { id: string; name: string }[]
  pontoId?: string
}

// Seletor de ponto de coleta para o gráfico de tendência. Sem ponto = "Todos"
// (a linha mistura pontos). Selecionar um ponto dá uma leitura limpa.
export function PointSelector({ points, pontoId }: PointSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set('pontoId', e.target.value)
    else params.delete('pontoId')
    router.push(`/gestor/dashboard?${params.toString()}`)
  }

  return (
    <select
      value={pontoId ?? ''}
      onChange={handleChange}
      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
    >
      <option value="">Todos os pontos</option>
      {points.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
