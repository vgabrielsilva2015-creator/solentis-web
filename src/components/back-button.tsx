'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
}

export function BackButton({ href, label = 'Voltar' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={1.75} />
      {label}
    </button>
  )
}
