// Config da landing (apresentação pública). Adaptado do export do Lovable para Next.
//
// Login: aponta para o /login nativo do próprio app (mesmo domínio).
// WhatsApp comercial: opcional, via NEXT_PUBLIC_SALES_WHATSAPP (só dígitos com DDI,
// ex.: 5511999999999). Sem ele, o botão fica desabilitado (não inventamos destino).

export const SALES_WHATSAPP = process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? ''
export const LOGIN_URL = '/login'

export const landingCopy = {
  eyebrow: 'GESTÃO INTELIGENTE DE ESTAÇÕES DE TRATAMENTO',
  headline: 'Sua ETE sob controle. Seu impacto sob gestão.',
  subheadline:
    'Centralize leituras, análises, produtos químicos, ocorrências e manutenção em uma única plataforma. Mais rastreabilidade para a operação, mais clareza para a gestão e mais controle sobre a conformidade ambiental.',
  primaryCta: 'Conhecer a Solentis',
}

export function waLink(text: string) {
  const base = SALES_WHATSAPP ? `https://wa.me/${SALES_WHATSAPP}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export const WA_DEFAULT =
  'Olá! Vi a página do Solentis e quero saber mais sobre o sistema para ETE.'
