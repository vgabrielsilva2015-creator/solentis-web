import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOGIN_URL, landingCopy } from './config'

/** Acesso à plataforma → /login nativo do app (mesmo domínio). */
export function PlatformAccess({ compact = false }: { compact?: boolean }) {
  const label = compact ? 'Entrar' : 'Entrar na plataforma'
  return (
    <Button asChild variant="soft" size={compact ? 'default' : 'xl'}>
      <Link href={LOGIN_URL}>
        {label}
        <ArrowRight />
      </Link>
    </Button>
  )
}

/** CTA primário: rola para a prévia do produto (#produto). */
export function ProductAction() {
  return (
    <Button asChild variant="hero" size="xl">
      <a href="#produto">
        {landingCopy.primaryCta}
        <ArrowRight />
      </a>
    </Button>
  )
}
