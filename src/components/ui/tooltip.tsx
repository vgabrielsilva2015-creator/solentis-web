'use client'

import * as React from 'react'
import { Tooltip as T } from 'radix-ui'

/**
 * Tooltip (Radix) — Solentis.
 * Wrapper simples: <Tooltip label="Editar"><button/></Tooltip>.
 * O trigger recebe o filho via asChild (precisa ser um único elemento).
 */

export function Tooltip({
  label,
  children,
  side = 'top',
  delayDuration = 200,
}: {
  label: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}) {
  return (
    <T.Provider delayDuration={delayDuration}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={6}
            className="z-[330] rounded-md border border-white/10 bg-[var(--surface-3)] px-2 py-1 text-xs font-medium text-foreground shadow-lg
              data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in data-[state=delayed-open]:zoom-in-95"
          >
            {label}
            <T.Arrow className="fill-[var(--surface-3)]" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
