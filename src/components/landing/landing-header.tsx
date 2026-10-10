'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InterestDialog } from './interest-dialog'
import { Logo } from './logo'
import { PlatformAccess } from './landing-actions'

const nav = [
  ['Produto', '#produto'],
  ['Como funciona', '#como-funciona'],
  ['Módulos', '#modulos'],
  ['Segurança', '#seguranca'],
  ['Perguntas', '#perguntas'],
]

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled || open ? 'border-b border-border bg-background/95' : 'bg-background'}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <a href="#" className="flex items-center gap-2 font-display text-lg font-bold" aria-label="Solentis, início">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex" aria-label="Principal">
          {nav.map(([l, h]) => (
            <a key={h} href={h} className="hover:text-foreground">
              {l}
            </a>
          ))}
          <Link href="/sobre-nos" className="hover:text-foreground">
            Sobre nós
          </Link>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <PlatformAccess compact />
          <InterestDialog>
            <Button variant="hero">Tenho interesse</Button>
          </InterestDialog>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-5 pb-6 lg:hidden">
          <nav className="flex flex-col py-2" aria-label="Celular">
            {nav.map(([l, h]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="py-3 text-base font-medium">
                {l}
              </a>
            ))}
            <Link href="/sobre-nos" onClick={() => setOpen(false)} className="py-3 text-base font-medium">
              Sobre nós
            </Link>
          </nav>
          <div className="flex gap-2">
            <PlatformAccess compact />
            <InterestDialog>
              <Button variant="hero" size="xl" className="flex-1">
                Tenho interesse
              </Button>
            </InterestDialog>
          </div>
        </div>
      )}
    </header>
  )
}
