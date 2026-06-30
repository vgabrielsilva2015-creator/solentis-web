'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Reveal — wrapper de entrada/saída reutilizável.
 * Sem dependências de animação. Usa a curva da casa: cubic-bezier(.16,1,.3,1).
 *
 *   <Reveal variant="fadeUp">    <Card/> </Reveal>
 *   <Reveal variant="scaleIn">   <Modal/></Reveal>
 *   <Reveal show={open} variant="slide">…</Reveal>   // controle manual entra/sai
 *
 * Para listas com stagger, use <RevealList> (abaixo).
 */

type RevealVariant = 'fadeUp' | 'scaleIn' | 'blurIn' | 'slide' | 'fade'

const HIDDEN: Record<RevealVariant, string> = {
  fadeUp:  'opacity-0 translate-y-5',
  scaleIn: 'opacity-0 scale-90',
  blurIn:  'opacity-0 blur-md',
  slide:   'opacity-0 -translate-x-7',
  fade:    'opacity-0',
}

const SHOWN = 'opacity-100 translate-y-0 translate-x-0 scale-100 blur-0'

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  show?: boolean
  variant?: RevealVariant
  duration?: number   // ms
  delay?: number      // ms
  as?: React.ElementType
}

export function Reveal({
  show = true,
  variant = 'fadeUp',
  duration = 640,
  delay = 0,
  as: Tag = 'div',
  className,
  children,
  style,
  ...rest
}: RevealProps) {
  // Garante que o estado inicial (oculto) seja pintado antes de transicionar.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const visible = show && mounted

  return (
    <Tag
      style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms`, ...style }}
      className={cn(
        'transition-all will-change-transform',
        'ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none',
        visible ? SHOWN : HIDDEN[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * RevealList — aplica o mesmo reveal a cada filho com stagger automático.
 */
interface RevealListProps {
  children: React.ReactNode
  variant?: RevealVariant
  stagger?: number   // ms entre cada filho
  duration?: number
  className?: string
}

export function RevealList({
  children,
  variant = 'fadeUp',
  stagger = 60,
  duration = 640,
  className,
}: RevealListProps) {
  return (
    <>
      {React.Children.map(children, (child, i) => (
        <Reveal
          variant={variant}
          duration={duration}
          delay={i * stagger}
          className={className}
        >
          {child}
        </Reveal>
      ))}
    </>
  )
}
