import Image from 'next/image'
import {
  Activity, FlaskConical, Beaker, AlertTriangle, Wrench, Clock, FileText, Upload,
  ShieldCheck, Lock, History, KeyRound, MessageCircle, CheckCircle2,
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ProductPreview } from './product-preview'
import { LandingHero } from './landing-hero'
import { LandingHeader } from './landing-header'
import { PlatformAccess, ProductAction } from './landing-actions'
import { LOGIN_URL, SALES_WHATSAPP, waLink, WA_DEFAULT } from './config'

const LOGO = '/landing/solentis-logo.png'

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-lg text-muted-foreground">{sub}</p>}
    </div>
  )
}

const modules = [
  [Activity, 'Leituras', 'Registro de parâmetros por ponto e turno, com limite visível na hora.'],
  [FlaskConical, 'Análises', 'Limites por teto, faixa ou eficiência, com alerta quando algo sai do esperado.'],
  [Beaker, 'Produtos químicos', 'Entradas, saídas, contagens e consumo do estoque da estação.'],
  [AlertTriangle, 'Ocorrências', 'Registre, acompanhe e encerre ocorrências com histórico completo.'],
  [Wrench, 'Manutenção', 'Preventiva e corretiva organizadas por equipamento.'],
  [Clock, 'Turnos', 'Escalas, tarefas e passagem de turno, com responsáveis em cada etapa.'],
  [FileText, 'Laudos', 'Laudos centralizados e fáceis de encontrar.'],
  [Upload, 'Importação', 'Importe planilhas e extraia informações de laudos com apoio de inteligência artificial.'],
] as const

const faqs: [string, string][] = [
  ['O Solentis serve para mais de uma estação?', 'Sim. O sistema é multi-planta, e os dados de cada planta ficam isolados entre si.'],
  ['Preciso instalar algo?', 'Não. O Solentis funciona no navegador, no computador ou no celular do operador.'],
  ['Quem pode ver e alterar cada informação?', 'O acesso é controlado por perfil: operador, técnico, gestor e manutenção. Alterações ficam registradas em auditoria.'],
  ['Consigo trazer meus dados atuais?', 'Sim, há um módulo de importação para laudos e dados existentes. Avaliamos o formato com você na implantação.'],
  ['O sistema já é usado em operação real?', 'Sim. O Solentis está em operação piloto em uma ETE industrial.'],
  ['Como começo?', 'Conheça os módulos e a apresentação da plataforma nesta página. O contato comercial será disponibilizado na integração com o Solentis.'],
]

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingHeader />
      <main>
        <LandingHero />
        <section id="produto" className="landing-container pt-8 pb-16">
          <SectionHead
            eyebrow="A plataforma"
            title="Tudo o que sua operação precisa. Em um só lugar."
            sub="Organize as rotinas da estação, acompanhe os indicadores e mantenha as informações operacionais conectadas em uma única plataforma."
          />
          <div className="mt-10">
            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:flex-row sm:gap-6">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-lg font-semibold">Em operação piloto em ETE industrial real</p>
            <p className="text-muted-foreground">Construído junto com quem opera a estação todos os dias.</p>
          </div>
        </section>

        <section id="modulos" className="bg-muted/50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHead eyebrow="Módulos" title="Toda a operação da ETE" sub="Módulos que conversam entre si, pensados para a rotina real da estação." />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map(([Icon, t, d]) => (
                <div key={t} className="group rounded-lg border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1">
                  <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground transition group-hover:bg-brand group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHead eyebrow="Como funciona" title="Em operação em 3 passos" />
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                ['Configuramos sua planta', 'Pontos de coleta, parâmetros, limites, produtos químicos e equipamentos da sua estação.'],
                ['A equipe registra no turno', 'Operadores lançam leituras e checklist pelo celular. Fora do limite, o sistema avisa.'],
                ['Gestão acompanha tudo', 'Ocorrências, manutenção, estoque e laudos visíveis para quem decide.'],
              ].map(([t, d], i) => (
                <li key={t} className="relative rounded-lg border border-border p-8">
                  <span className="font-display text-5xl font-bold text-brand">0{i + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                  <p className="mt-2 text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="seguranca" className="py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <SectionHead eyebrow="Segurança" title="Seus dados protegidos e rastreáveis" />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [ShieldCheck, 'Isolamento entre plantas', 'Os dados de cada planta ficam separados.'],
                [History, 'Auditoria de alterações', 'Quem alterou o quê e quando fica registrado.'],
                [Lock, 'Acesso por perfil', 'Cada pessoa vê e faz apenas o que seu perfil permite.'],
                [KeyRound, 'Segundo fator (TOTP)', 'Autenticação em dois fatores para administradores da plataforma.'],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Lock
                return (
                  <div key={t as string} className="rounded-lg border border-border bg-card p-6 shadow-soft">
                    <Icon className="size-6 text-primary" />
                    <h3 className="mt-4 font-semibold">{t as string}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{d as string}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="perguntas" className="bg-muted/50 py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-5">
            <SectionHead eyebrow="Perguntas" title="Perguntas frequentes" />
            <Accordion type="single" collapsible className="mt-12 rounded-lg border border-border bg-card px-6">
              {faqs.map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-muted px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-6xl px-6 text-center sm:px-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-5xl">Coloque sua ETE sob controle.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Conte sobre sua estação e mostramos o Solentis funcionando.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
              <ProductAction />
              <PlatformAccess />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Image src={LOGO} alt="" width={32} height={32} className="size-8" />
            <p>© {new Date().getFullYear()} solentis</p>
          </div>
          <nav className="flex flex-wrap gap-6" aria-label="Rodapé">
            {SALES_WHATSAPP && (
              <a href={waLink(WA_DEFAULT)} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                Contato
              </a>
            )}
            <a href={LOGIN_URL} className="hover:text-foreground">Entrar</a>
            <a href="/privacidade" className="hover:text-foreground">Política de Privacidade</a>
          </nav>
        </div>
      </footer>

      {SALES_WHATSAPP && (
        <a
          href={waLink(WA_DEFAULT)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar pelo WhatsApp"
          className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-success text-primary-foreground shadow-glow lg:hidden"
        >
          <MessageCircle />
        </a>
      )}
    </div>
  )
}
