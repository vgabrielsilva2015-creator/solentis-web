import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * StatusBadge — pílula de estado de domínio do Solentis. Um só componente
 * para os dois vocabulários de estado que se repetem em todas as telas:
 *   · conformidade: 'ok' | 'warn' | 'danger' | 'critical'
 *   · severidade:   'baixa' | 'media' | 'alta' | 'critica'
 *
 * Rotula em pt-BR automaticamente, a menos que `children` sobrescreva.
 * Cor sempre vem dos tokens de status (--ok/--warn/--danger/--critical) —
 * nunca invente cor de estado; roteie por aqui.
 */
export type StatusKind =
  | "ok"
  | "warn"
  | "danger"
  | "critical"
  | "baixa"
  | "media"
  | "alta"
  | "critica"

type Skin = {
  /** classe de texto (variante soft) e de fundo (variante solid) */
  fg: string
  softBg: string
  dotBg: string
  label: string
}

const MAP: Record<StatusKind, Skin> = {
  ok: { fg: "text-ok", softBg: "bg-ok-soft", dotBg: "bg-ok", label: "Conforme" },
  warn: { fg: "text-warn", softBg: "bg-warn-soft", dotBg: "bg-warn", label: "Atenção" },
  danger: { fg: "text-danger", softBg: "bg-danger-soft", dotBg: "bg-danger", label: "Fora do limite" },
  critical: { fg: "text-critical", softBg: "bg-critical-soft", dotBg: "bg-critical", label: "Crítico" },
  baixa: { fg: "text-ok", softBg: "bg-ok-soft", dotBg: "bg-ok", label: "Baixa" },
  media: { fg: "text-warn", softBg: "bg-warn-soft", dotBg: "bg-warn", label: "Média" },
  alta: { fg: "text-danger", softBg: "bg-danger-soft", dotBg: "bg-danger", label: "Alta" },
  critica: { fg: "text-critical", softBg: "bg-critical-soft", dotBg: "bg-critical", label: "Crítica" },
}

const SOLID_BG: Record<StatusKind, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  critical: "bg-critical",
  baixa: "bg-ok",
  media: "bg-warn",
  alta: "bg-danger",
  critica: "bg-critical",
}

/** Severidade do Prisma (LOW/MEDIUM/HIGH/CRITICAL) → vocabulário do badge. */
export const SEVERITY_TO_STATUS: Record<string, StatusKind> = {
  LOW: "baixa",
  MEDIUM: "media",
  HIGH: "alta",
  CRITICAL: "critica",
}

export interface StatusBadgeProps
  extends Omit<React.ComponentProps<"span">, "children"> {
  status?: StatusKind
  /** Fundo sólido em vez de soft-tint. */
  solid?: boolean
  /** Mostra o ponto colorido (padrão: true). */
  dot?: boolean
  children?: React.ReactNode
}

export function StatusBadge({
  status = "ok",
  solid = false,
  dot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const m = MAP[status] ?? MAP.ok

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex h-[22px] w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] text-xs font-semibold leading-none",
        solid ? cn(SOLID_BG[status], "text-[var(--c-on-brand)]") : cn(m.softBg, m.fg),
        className
      )}
      {...props}
    >
      {dot ? (
        <span
          className={cn(
            "size-[7px] shrink-0 rounded-full",
            solid ? "bg-[var(--c-on-brand)]" : m.dotBg
          )}
        />
      ) : null}
      {children ?? m.label}
    </span>
  )
}
