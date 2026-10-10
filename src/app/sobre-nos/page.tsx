import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Activity, Users, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { ProductPreview } from '@/components/landing/product-preview'
import { InterestDialog } from '@/components/landing/interest-dialog'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Sobre nós — Solentis',
  description:
    'Conheça o Solentis: tecnologia para conectar a rotina das estações de tratamento de efluentes à gestão ambiental.',
}

export default function SobreNos() {
  return (
    <div className="landing-scope min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="Solentis, início">
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-7xl px-5 pt-16 pb-12 lg:px-8 lg:pt-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-primary">Sobre nós</p>
            <h1 className="mt-4 text-4xl font-bold sm:text-6xl">Somos o Solentis.</h1>
            <p className="mt-6 text-xl text-muted-foreground">
              Tecnologia conectada à rotina de quem cuida da água.
            </p>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              O Solentis foi desenvolvido para reunir a operação de estações de tratamento de
              efluentes em um só lugar. Nosso propósito é tornar as informações da estação mais
              claras, rastreáveis e acessíveis para quem opera e para quem decide.
            </p>
          </div>
          <div className="mt-12">
            <ProductPreview />
          </div>
        </section>
        <section className="border-y border-border bg-muted/50">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-3 lg:px-8">
            {[
              [Activity, 'Perto da operação', 'Em operação piloto em uma ETE industrial real, o Solentis é construído junto com quem vive a rotina da estação.'],
              [Users, 'Uma equipe conectada', 'Operadores, técnicos, gestores e manutenção compartilham informações para dar continuidade ao trabalho de cada turno.'],
              [ShieldCheck, 'Foco na conformidade', 'Leituras, análises, ocorrências e laudos conectados ajudam a acompanhar a estação com histórico e responsabilidade.'],
            ].map(([I, heading, text]) => {
              const Icon = I as typeof Activity
              return (
                <div key={String(heading)}>
                  <Icon className="size-6 text-primary" />
                  <h2 className="mt-5 text-xl font-semibold">{String(heading)}</h2>
                  <p className="mt-3 text-muted-foreground">{String(text)}</p>
                </div>
              )
            })}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <h2 className="text-3xl font-bold">Vamos conversar sobre sua estação?</h2>
          <InterestDialog>
            <Button variant="hero" size="xl" className="mt-6">
              Tenho interesse
              <ArrowRight />
            </Button>
          </InterestDialog>
        </section>
      </main>
    </div>
  )
}
