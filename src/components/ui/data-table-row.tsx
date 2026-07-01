'use client'

import * as React from 'react'
import { MoreVertical, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from './tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './dropdown-menu'

/**
 * DataTableRow — linha de tabela padrão do admin (Solentis).
 *
 * - A linha inteira é clicável e chama `onEdit` (abre o Sheet de edição).
 * - Ação principal: ícone Pencil com tooltip "Editar" (mesma ação do clique).
 * - Ações secundárias: kebab (MoreVertical) → DropdownMenu.
 * - Hover suave (bg-muted/50). Área de toque ≥44px no kebab (PWA mobile).
 *
 * As células de dados vêm por `children` (uma sequência de <td>). A célula de
 * ações é anexada automaticamente à direita.
 */

export type RowAction = {
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

const iconBtn =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground ' +
  'transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50'

export function DataTableRow({
  onEdit,
  actions = [],
  editLabel = 'Editar',
  className,
  children,
}: {
  onEdit: () => void
  actions?: RowAction[]
  editLabel?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <tr
      onClick={onEdit}
      className={cn(
        'group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50',
        className,
      )}
    >
      {children}

      {/* Célula de ações — não propaga o clique para a linha. */}
      <td
        className="px-3 py-2 text-right align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-0.5">
          <Tooltip label={editLabel}>
            <button
              type="button"
              aria-label={editLabel}
              onClick={onEdit}
              className={iconBtn}
            >
              <Pencil className="size-[17px]" strokeWidth={2} />
            </button>
          </Tooltip>

          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mais ações"
                  className={iconBtn}
                >
                  <MoreVertical className="size-[18px]" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {actions.map((a) => (
                  <DropdownMenuItem
                    key={a.label}
                    danger={a.danger}
                    disabled={a.disabled}
                    onSelect={(e) => {
                      e.preventDefault()
                      a.onSelect()
                    }}
                  >
                    {a.icon}
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  )
}
