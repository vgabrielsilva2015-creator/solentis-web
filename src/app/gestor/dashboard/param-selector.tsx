'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface ParamSelectorProps {
  parameters: { id: string; name: string }[]
  defaultValue?: string
  diasNum: number
}

export function ParamSelector({ parameters, defaultValue, diasNum }: ParamSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParam = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('paramId', newParam)
    params.set('dias', diasNum.toString())
    startTransition(() => router.push(`/gestor/dashboard?${params.toString()}`))
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={handleChange}
      disabled={isPending}
      className="bg-card border border-border text-foreground text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      {parameters.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
