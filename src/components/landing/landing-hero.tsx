import { MessageCircle } from 'lucide-react'
import { Logo } from './logo'
import { OpeningWave } from './opening-wave'
import { ProductAction, PlatformAccess } from './landing-actions'
import { landingCopy, SALES_WHATSAPP, WA_DEFAULT, waLink } from './config'

export function LandingHero() {
  return (
    <section className="landing-hero relative isolate overflow-hidden bg-background">
      <OpeningWave />
      <div className="landing-container relative text-center">
        <div className="mx-auto max-w-5xl animate-rise">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-primary">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {landingCopy.eyebrow}
          </p>
          <div className="mt-7 flex justify-center">
            <Logo />
          </div>
          <h1 className="hero-headline mx-auto mt-6 max-w-5xl font-display font-semibold">
            Sua ETE sob controle.
            <br />
            Seu impacto sob gestão.
          </h1>
          <p className="hero-subheadline mx-auto mt-6 max-w-[720px] text-muted-foreground">
            {landingCopy.subheadline}
          </p>
          <div className="hero-actions mt-8 flex flex-wrap justify-center gap-3">
            <ProductAction />
            <PlatformAccess />
          </div>
          {SALES_WHATSAPP && (
            <a
              href={waLink(WA_DEFAULT)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="size-4" />
              Fale pelo WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
