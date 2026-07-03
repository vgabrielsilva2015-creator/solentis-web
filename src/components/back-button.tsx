'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
}

export function BackButton({ href, label = 'Voltar' }: BackButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => setIsPending(true)}
        className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} strokeWidth={1.75} />}
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsPending(true)
        router.back()
      }}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-70"
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} strokeWidth={1.75} />}
      {label}
    </button>
  )
}
