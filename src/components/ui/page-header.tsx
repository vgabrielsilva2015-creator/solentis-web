import React from 'react'

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h1>
      {description && <p className="text-sm text-slate-400">{description}</p>}
    </div>
  )
}
