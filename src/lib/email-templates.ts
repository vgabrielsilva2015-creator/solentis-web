/**
 * Templates de e-mail transacional do Solentis (convite e redefinição de senha).
 *
 * Centraliza o layout profissional (antes era HTML inline duplicado em 3 lugares).
 * Regras de compatibilidade com clientes de e-mail:
 *  - layout em TABELAS (não flex/grid) e estilos INLINE;
 *  - logo por URL pública hospedada (clientes não aceitam data: URI de forma confiável);
 *  - botão "bulletproof" + link cru como fallback (caso o botão não renderize);
 *  - preheader oculto (texto de prévia na caixa de entrada).
 */

const BRAND = {
  name: 'Solentis',
  tagline: 'Gestão de Estação de Tratamento de Efluentes',
  primary: '#0891b2', // cyan-600, combina com a logo (teal/cyan)
  primaryDark: '#0e7490',
  text: '#1f2937',
  bodyText: '#374151',
  muted: '#6b7280',
  bg: '#f1f5f9',
  card: '#ffffff',
  border: '#e5e7eb',
}

export const EMAIL_SUBJECTS = {
  invite: 'Seu convite para o Solentis',
  reset: 'Redefinição de senha — Solentis',
} as const

/** URL base para montar o link da logo — mesmo critério do buildResetUrl. */
function baseUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://solentis.app'
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface EmailLayoutParams {
  preheader: string
  heading: string
  /** Texto do corpo (já escapado onde houver dado do usuário). */
  intro: string
  ctaLabel: string
  ctaUrl: string
  note?: string
}

function renderEmailLayout(p: EmailLayoutParams): string {
  const logo = `${baseUrl()}/icons/icon-192x192.png`
  const ctaUrl = escapeHtml(p.ctaUrl)
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:8px 0 20px;">
            <img src="${logo}" width="56" height="56" alt="Solentis" style="display:block;border-radius:12px;" />
            <div style="font-size:18px;font-weight:700;color:${BRAND.primaryDark};letter-spacing:.3px;margin-top:10px;">${BRAND.name}</div>
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;padding:32px;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${BRAND.text};">${escapeHtml(p.heading)}</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${BRAND.bodyText};">${p.intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
              <tr>
                <td align="center" bgcolor="${BRAND.primary}" style="border-radius:8px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(p.ctaLabel)}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:13px;color:${BRAND.muted};">Se o botão não funcionar, copie e cole este link no navegador:</p>
            <p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="${ctaUrl}" style="color:${BRAND.primaryDark};">${ctaUrl}</a></p>
            ${p.note ? `<p style="margin:0;padding-top:16px;border-top:1px solid ${BRAND.border};font-size:13px;color:${BRAND.muted};line-height:1.5;">${escapeHtml(p.note)}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 8px;">
            <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.5;">${BRAND.name} — ${BRAND.tagline}<br/>Esta é uma mensagem automática. Por favor, não responda a este e-mail.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/** E-mail de convite de novo usuário (define a própria senha). TTL 7 dias. */
export function inviteEmailHtml({ name, url }: { name: string; url: string }): string {
  return renderEmailLayout({
    preheader: 'Você foi convidado para o Solentis. Defina sua senha para acessar.',
    heading: 'Bem-vindo ao Solentis',
    intro: `Olá, ${escapeHtml(name)}. Uma conta foi criada para você no Solentis. Clique no botão abaixo para definir sua senha e acessar o sistema. O link é válido por <strong>7 dias</strong>.`,
    ctaLabel: 'Definir minha senha',
    ctaUrl: url,
    note: 'Se você não esperava este convite, pode ignorar este e-mail com segurança.',
  })
}

/** E-mail de redefinição de senha. TTL 60 min. */
export function passwordResetEmailHtml({ url }: { url: string }): string {
  return renderEmailLayout({
    preheader: 'Redefina a senha da sua conta Solentis.',
    heading: 'Redefinição de senha',
    intro: 'Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>60 minutos</strong>.',
    ctaLabel: 'Redefinir senha',
    ctaUrl: url,
    note: 'Se você não solicitou isso, ignore este e-mail — sua senha continua a mesma.',
  })
}
