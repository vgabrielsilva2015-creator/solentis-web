'use client'

import * as React from 'react'
import { Dialog } from 'radix-ui'
import { X, Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Modal (Radix Dialog) — Solentis.
 * Animações por data-state via tw-animate-css; curva da casa; backdrop com blur.
 *
 * 1) <Modal> genérico — qualquer conteúdo (formulários, detalhes)
 * 2) <ConfirmDialog> — confirmação pronta (ex.: excluir)
 */

type Intent = 'brand' | 'danger' | 'critical'

const INTENT: Record<Intent, { chip: string; text: string }> = {
  brand:    { chip: 'bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]', text: 'text-[var(--brand)]' },
  danger:   { chip: 'bg-[color-mix(in_oklab,var(--alarm)_14%,transparent)]', text: 'text-[var(--alarm)]' },
  critical: { chip: 'bg-[color-mix(in_oklab,var(--alarm)_16%,transparent)]', text: 'text-[var(--alarm)]' },
}

const overlayCls =
  'fixed inset-0 z-[300] bg-black/60 backdrop-blur-[6px] ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200'

const contentCls =
  'fixed left-1/2 top-1/2 z-[300] w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 ' +
  'overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl ' +
  'ease-[cubic-bezier(.16,1,.3,1)] focus:outline-none ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 ' +
  'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200'

interface ModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  icon?: React.ReactNode
  intent?: Intent
  children?: React.ReactNode
}

export function Modal({ open, onOpenChange, title, description, icon, intent = 'brand', children }: ModalProps) {
  const c = INTENT[intent]
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayCls} />
        <Dialog.Content className={contentCls}>
          <Dialog.Close className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
            <X className="size-[15px]" strokeWidth={2.2} />
          </Dialog.Close>

          {icon ? (
            <div className="mb-4 flex items-center gap-3">
              <span className={cn('flex size-11 items-center justify-center rounded-xl', c.chip, c.text)}>{icon}</span>
              <div>
                <Dialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground">{title}</Dialog.Title>
                {description && <Dialog.Description className="mt-0.5 text-[13px] text-muted-foreground">{description}</Dialog.Description>}
              </div>
            </div>
          ) : (
            <>
              <Dialog.Title className="mb-2 font-heading text-lg font-semibold tracking-tight text-foreground">{title}</Dialog.Title>
              {description && <Dialog.Description className="mb-6 text-sm leading-relaxed text-muted-foreground">{description}</Dialog.Description>}
            </>
          )}

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2.5">{children}</div>
}

export function ModalButton({
  variant = 'ghost', className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost' | 'primary' | 'danger' }) {
  return (
    <button
      className={cn(
        'h-10 rounded-[10px] px-[18px] text-sm transition-all active:scale-[0.98]',
        variant === 'ghost'   && 'border border-white/10 font-medium text-foreground hover:bg-white/5',
        variant === 'primary' && 'bg-primary font-semibold text-primary-foreground hover:brightness-105',
        variant === 'danger'  && 'bg-[var(--alarm)] font-semibold text-white hover:brightness-110',
        className,
      )}
      {...props}
    />
  )
}

interface ConfirmProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  intent?: 'brand' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  intent = 'danger', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={intent === 'danger' ? <Trash2 className="size-[22px]" /> : <TriangleAlert className="size-[22px]" />}
      intent={intent === 'danger' ? 'danger' : 'brand'}
    >
      {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      <ModalFooter>
        <ModalButton variant="ghost" onClick={() => onOpenChange(false)}>{cancelLabel}</ModalButton>
        <ModalButton
          variant={intent === 'danger' ? 'danger' : 'primary'}
          onClick={() => { onConfirm(); onOpenChange(false) }}
        >
          {confirmLabel}
        </ModalButton>
      </ModalFooter>
    </Modal>
  )
}
