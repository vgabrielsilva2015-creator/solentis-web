'use client'

import * as React from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sheet (Drawer lateral) — Solentis.
 * Radix Dialog ancorado à direita. Usado para edição in-place sem trocar de página.
 * Anima via data-state (tw-animate-css), backdrop com blur, curva da casa.
 */

const overlayCls =
  'fixed inset-0 z-[300] bg-black/60 backdrop-blur-[4px] ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200'

const contentCls =
  'fixed right-0 top-0 z-[300] flex h-dvh w-[460px] max-w-[94vw] flex-col ' +
  'border-l border-white/10 bg-[var(--surface)] shadow-2xl ' +
  'ease-[cubic-bezier(.16,1,.3,1)] focus:outline-none ' +
  'data-[state=open]:animate-in data-[state=open]:slide-in-from-right ' +
  'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300'

interface SheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
}

export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content className={contentCls}>
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 truncate text-[13px] text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-[18px]" strokeWidth={2.2} />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
