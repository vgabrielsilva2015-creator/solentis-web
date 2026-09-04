import React from 'react'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Inbox } from 'lucide-react'

export interface DataTableProps extends React.HTMLAttributes<HTMLTableElement> {
  headers: React.ReactNode[]
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  children: React.ReactNode
}

export function DataTable({
  headers,
  isEmpty = false,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyAction,
  className,
  children,
  ...props
}: DataTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <table className={cn("w-full text-left text-sm", className)} {...props}>
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="h-10 px-4 align-middle font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
              {/* Espaço para as actions da DataTableRow (kebab / edit) */}
              <th className="h-10 px-4 align-middle font-medium w-16" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {!isEmpty ? (
              children
            ) : (
              <tr>
                <td colSpan={headers.length + 1} className="p-0">
                  <div className="p-8">
                    <EmptyState
                      icon={Inbox}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                      className="border-none shadow-none min-h-[300px]"
                    />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
