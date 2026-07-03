'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, X, TriangleAlert, Info, Archive, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sistema de toast — Solentis.
 *   1) Envolva o app com <ToastProvider> (em app/layout.tsx ou um client root).
 *   2) Em qualquer componente client:  const toast = useToast()
 *      toast.success('Ocorrência registrada', 'O evento #OC-2041 foi salvo.')
 *      toast.error(...), toast.warn(...), toast.info(...)
 *      toast.show({ title, description, variant, action: { label, onClick } })
 */

type ToastVariant = 'success' | 'error' | 'warn' | 'info' | 'action' | 'loading'

interface ToastAction { label: string; onClick: () => void }
interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number              // ms (default 5000; loading não some sozinho)
  action?: ToastAction
}
interface ToastItem extends ToastInput { id: number }

const META: Record<ToastVariant, { accent: string; soft: string; Icon: React.ElementType }> = {
  success: { accent: 'var(--success)', soft: 'color-mix(in oklab, var(--success) 14%, transparent)', Icon: Check },
  error:   { accent: 'var(--alarm)',   soft: 'color-mix(in oklab, var(--alarm) 14%, transparent)',   Icon: X },
  warn:    { accent: 'var(--data)',    soft: 'color-mix(in oklab, var(--data) 14%, transparent)',    Icon: TriangleAlert },
  info:    { accent: 'var(--data)',    soft: 'color-mix(in oklab, var(--data) 14%, transparent)',    Icon: Info },
  action:  { accent: 'var(--brand)',   soft: 'color-mix(in oklab, var(--brand) 14%, transparent)',   Icon: Archive },
  loading: { accent: 'var(--data)',    soft: 'color-mix(in oklab, var(--data) 14%, transparent)',    Icon: Loader2 },
}

interface ToastCtx {
  show: (t: ToastInput) => number
  dismiss: (id: number) => void
  success: (title: string, description?: string) => number
  error: (title: string, description?: string) => number
  warn: (title: string, description?: string) => number
  info: (title: string, description?: string) => number
}
const Ctx = React.createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({
  children,
  position = 'bottom-right',
}: { children: React.ReactNode; position?: 'bottom-right' | 'top-right' }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const seq = React.useRef(0)

  const dismiss = React.useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const show = React.useCallback((t: ToastInput) => {
    const id = ++seq.current
    const item: ToastItem = { variant: 'info', duration: 5000, ...t, id }
    setToasts(ts => [item, ...ts].slice(0, 5))
    return id
  }, [])

  const api = React.useMemo<ToastCtx>(() => ({
    show, dismiss,
    success: (title, description) => show({ title, description, variant: 'success' }),
    error:   (title, description) => show({ title, description, variant: 'error' }),
    warn:    (title, description) => show({ title, description, variant: 'warn' }),
    info:    (title, description) => show({ title, description, variant: 'info' }),
  }), [show, dismiss])

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} position={position} />
    </Ctx.Provider>
  )
}

function ToastViewport({
  toasts, onDismiss, position,
}: { toasts: ToastItem[]; onDismiss: (id: number) => void; position: 'bottom-right' | 'top-right' }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <ol
      className={cn(
        'pointer-events-none fixed right-6 z-[200] flex w-[360px] max-w-[86vw] gap-3',
        position === 'top-right' ? 'top-6 flex-col' : 'bottom-6 flex-col-reverse',
      )}
    >
      {toasts.map(t => <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />)}
    </ol>,
    document.body,
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { accent, soft, Icon } = META[toast.variant ?? 'info']
  const isLoading = toast.variant === 'loading'
  const duration = toast.duration ?? 5000
  const [leaving, setLeaving] = React.useState(false)
  const [paused, setPaused] = React.useState(false)

  const close = React.useCallback(() => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 260)
  }, [toast.id, onDismiss])

  // auto-dismiss com pausa no hover (descontando o tempo decorrido)
  const remaining = React.useRef(duration)
  const startedAt = React.useRef(Date.now())
  React.useEffect(() => {
    if (isLoading || paused) return
    startedAt.current = Date.now()
    const id = setTimeout(close, remaining.current)
    return () => {
      clearTimeout(id)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current))
    }
  }, [isLoading, paused, close])

  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-leaving={leaving}
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-xl border border-primary/10',
        'bg-[var(--surface-2)] shadow-[0_1px_2px_rgba(0,0,0,.4),0_16px_34px_rgba(0,0,0,.34)]',
        'ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none',
        leaving
          ? 'animate-out fade-out slide-out-to-right-8 duration-300'
          : 'animate-in fade-in slide-in-from-right-8 duration-400',
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <div className="flex gap-3 p-[14px_14px_14px_15px]">
        <span
          className="mt-px flex size-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: soft, color: accent }}
        >
          <Icon className={cn('size-4', isLoading && 'animate-spin')} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1 pt-px">
          <p className="text-[13.5px] font-semibold leading-snug text-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); close() }}
              className="mt-2 text-[12.5px] font-semibold"
              style={{ color: accent }}
            >
              {toast.action.label} →
            </button>
          )}
        </div>
        <button
          onClick={close}
          aria-label="Fechar"
          className="flex size-6 shrink-0 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-primary/90/10 hover:text-foreground"
        >
          <X className="size-[13px]" strokeWidth={2.4} />
        </button>
      </div>
      {!isLoading && !leaving && (
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left"
          style={{
            background: accent,
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
    </li>
  )
}
