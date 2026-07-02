'use client'

import * as React from 'react'
import { DropdownMenu as DM } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * DropdownMenu (Radix) — Solentis.
 * Usado para ações secundárias de linha (kebab MoreVertical).
 */

export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[320] min-w-[11rem] overflow-hidden rounded-xl border border-primary/10 bg-[var(--surface)] p-1 shadow-2xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-150',
          className,
        )}
        {...props}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  )
}

export function DropdownMenuItem({
  className,
  danger = false,
  ...props
}: React.ComponentProps<typeof DM.Item> & { danger?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors',
        'data-[highlighted]:bg-white/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        danger ? 'text-[var(--alarm)]' : 'text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <DM.Separator className={cn('my-1 h-px bg-white/10', className)} />
}
