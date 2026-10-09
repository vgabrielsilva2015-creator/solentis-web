import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Solentis',
  description:
    'Como o Solentis trata os dados pessoais enviados pelo formulário comercial, conforme a LGPD.',
}

export default function Privacidade() {
  return (
    <div className="landing-scope min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="rounded-2xl border border-warning bg-warning/10 px-4 py-3 text-sm font-medium">
          Rascunho: revisar com assessoria jurídica antes da publicação.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-4xl font-bold">Política de Privacidade</h1>
        <div className="mt-8 space-y-6 text-muted-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
          <h2>Dados coletados</h2>
          <p>
            Pelo formulário “Tenho interesse” coletamos nome, empresa, cargo, WhatsApp, e-mail e, se
            você quiser, uma mensagem. Também podemos registrar parâmetros de campanha (utm e gclid)
            da página.
          </p>
          <h2>Finalidade</h2>
          <p>
            Os dados são usados apenas para entrar em contato sobre o Solentis e responder à sua
            solicitação.
          </p>
          <h2>Base legal</h2>
          <p>Consentimento do titular (art. 7º, I, da LGPD), dado ao marcar a caixa no formulário.</p>
          <h2>Compartilhamento e retenção</h2>
          <p>
            Não vendemos seus dados. Eles são mantidos pelo tempo necessário ao contato comercial e,
            depois, excluídos.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Você pode pedir acesso, correção ou exclusão dos seus dados e revogar o consentimento a
            qualquer momento pelos nossos canais de contato.
          </p>
        </div>
      </main>
    </div>
  )
}
