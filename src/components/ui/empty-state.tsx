import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
