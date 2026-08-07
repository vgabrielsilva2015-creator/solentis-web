import * as React from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SidePanelProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  size?: 'sm' | 'default' | 'lg' | 'xl'
  children?: React.ReactNode
  footer?: React.ReactNode
}

const overlayCls =
  'fixed inset-0 z-[300] bg-black/60 backdrop-blur-[4px] ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200'

const sizeVariants = {
  sm: 'w-[320px]',
  default: 'w-[460px]',
  lg: 'w-[640px]',
  xl: 'w-[800px]',
}

export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  size = 'default',
  children,
  footer,
}: SidePanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-[300] flex h-dvh max-w-[94vw] flex-col border-l border-primary/10 bg-[var(--surface)] shadow-2xl ease-[cubic-bezier(.16,1,.3,1)] focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300',
            sizeVariants[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/90/10 hover:text-foreground"
            >
              <X className="size-[18px]" strokeWidth={2.2} />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="border-t border-primary/10 bg-muted/30 px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
