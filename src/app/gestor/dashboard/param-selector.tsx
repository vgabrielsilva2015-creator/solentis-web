'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface ParamSelectorProps {
  parameters: { id: string; name: string }[]
  defaultValue?: string
  diasNum: number
}

export function ParamSelector({ parameters, defaultValue, diasNum }: ParamSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParam = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('paramId', newParam)
    params.set('dias', diasNum.toString())
    router.push(`/gestor/dashboard?${params.toString()}`)
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={handleChange}
      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
    >
      {parameters.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
