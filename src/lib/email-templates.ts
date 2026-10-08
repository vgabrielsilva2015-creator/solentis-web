/**
 * Templates de e-mail transacional do Solentis.
 *
 * Três e-mails: convite (novo usuário define a senha), redefinição de senha
 * (link de reset) e confirmação de senha alterada (aviso de segurança).
 *
 * Compatibilidade com clientes de e-mail (Gmail, Outlook, Apple Mail…):
 *  - layout em TABELAS e estilos INLINE (nada de fl/grid/classe/<style>);
 *  - pilha de fontes do sistema (webfont em e-mail é instável);
 *  - logo por URL hospedada (data: URI é bloqueado em muitos clientes);
 *  - botão "bulletproof" (padding no <a> + bgcolor no <td>) + link cru de fallback;
 *  - header com degradê que degrada para cor sólida no Outlook (bgcolor);
 *  - preheader oculto (texto de prévia na caixa de entrada).
 */

const BRAND = {
  name: 'Solentis',
  tagline: 'Gestão de Estação de Tratamento de Efluentes',
  // Teal/cyan da logo — o único acento "forte"; o resto fica quieto.
  teal: '#0e7490', // cyan-700
  cyan: '#06b6d4', // cyan-500
  primary: '#0891b2', // cyan-600 (botão)
  ink: '#0f172a', // slate-900
  body: '#334155', // slate-700
  muted: '#64748b', // slate-500
  ground: '#eef2f6', // neutro frio (leve viés teal)
  card: '#ffffff',
  border: '#e2e8f0', // slate-200
  pill: '#f1f5f9', // slate-100
}

export const EMAIL_SUBJECTS = {
  invite: 'Seu convite para o Solentis',
  reset: 'Redefinição de senha — Solentis',
  passwordChanged: 'Sua senha do Solentis foi alterada',
} as const

/** URL base para a logo e links — mesmo critério do buildResetUrl. */
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
  eyebrow: string
  heading: string
  /** Corpo do e-mail (HTML; dado do usuário deve vir já escapado). */
  intro: string
  ctaLabel: string
  ctaUrl: string
  note?: string
}

function renderEmailLayout(p: EmailLayoutParams): string {
  const logo = `${baseUrl()}/icons/icon-192x192.png`
  const ctaUrl = escapeHtml(p.ctaUrl)
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.ground};margin:0;padding:32px 12px;font-family:${font};">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">

        <!-- Header: faixa teal com logo e marca -->
        <tr>
          <td bgcolor="${BRAND.teal}" style="background-color:${BRAND.teal};background-image:linear-gradient(135deg,${BRAND.teal} 0%,${BRAND.cyan} 100%);padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" valign="middle" width="56">
                  <img src="${logo}" width="48" height="48" alt="Solentis" style="display:block;border-radius:11px;background:#ffffff;" />
                </td>
                <td align="left" valign="middle" style="padding-left:14px;">
                  <div style="font-size:19px;font-weight:700;color:#ffffff;letter-spacing:.3px;line-height:1.1;">${BRAND.name}</div>
                  <div style="font-size:12px;color:#e0f2fe;line-height:1.4;margin-top:2px;">${BRAND.tagline}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td bgcolor="${BRAND.card}" style="background:${BRAND.card};padding:36px 32px 32px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND.primary};margin-bottom:10px;">${escapeHtml(p.eyebrow)}</div>
            <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${escapeHtml(p.heading)}</h1>
            <div style="width:44px;height:3px;border-radius:2px;background:${BRAND.cyan};margin:0 0 20px;"></div>
            <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:${BRAND.body};">${p.intro}</p>

            <!-- Botão bulletproof -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td align="center" bgcolor="${BRAND.primary}" style="border-radius:10px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(p.ctaLabel)} &rarr;</a>
                </td>
              </tr>
            </table>

            <!-- Fallback do link -->
            <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};">Se o botão não funcionar, copie e cole este link no navegador:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
              <tr>
                <td bgcolor="${BRAND.pill}" style="background:${BRAND.pill};border:1px solid ${BRAND.border};border-radius:8px;padding:11px 14px;font-size:12px;word-break:break-all;">
                  <a href="${ctaUrl}" style="color:${BRAND.teal};text-decoration:none;">${ctaUrl}</a>
                </td>
              </tr>
            </table>

            ${p.note ? `<p style="margin:24px 0 0;padding-top:18px;border-top:1px solid ${BRAND.border};font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(p.note)}</p>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="${BRAND.card}" style="background:${BRAND.card};padding:0 32px 28px;">
            <div style="border-top:1px solid ${BRAND.border};padding-top:18px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                <strong style="color:${BRAND.body};">${BRAND.name}</strong> — ${BRAND.tagline}<br/>
                Esta é uma mensagem automática. Por favor, não responda a este e-mail.
              </p>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`
}

/** Convite de novo usuário (define a própria senha). TTL 7 dias. */
export function inviteEmailHtml({ name, url }: { name: string; url: string }): string {
  return renderEmailLayout({
    preheader: 'Você foi convidado para o Solentis. Defina sua senha para acessar.',
    eyebrow: 'Convite',
    heading: 'Bem-vindo ao Solentis',
    intro: `Olá, ${escapeHtml(name)}. Uma conta foi criada para você no Solentis. Para começar, defina sua senha de acesso clicando no botão abaixo. Por segurança, este convite expira em <strong>7 dias</strong>.`,
    ctaLabel: 'Definir minha senha',
    ctaUrl: url,
    note: 'Se você não esperava este convite, pode ignorar este e-mail com segurança — nenhuma ação será tomada.',
  })
}

/** Link de redefinição de senha. TTL 60 min. */
export function passwordResetEmailHtml({ url }: { url: string }): string {
  return renderEmailLayout({
    preheader: 'Redefina a senha da sua conta Solentis. O link expira em 60 minutos.',
    eyebrow: 'Redefinição de senha',
    heading: 'Vamos redefinir sua senha',
    intro: 'Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha. Por segurança, este link é válido por <strong>60 minutos</strong> e só pode ser usado uma vez.',
    ctaLabel: 'Redefinir senha',
    ctaUrl: url,
    note: 'Se você não solicitou isso, ignore este e-mail — sua senha permanece a mesma.',
  })
}

/** Confirmação de senha alterada (aviso de segurança, sem ação obrigatória). */
export function passwordChangedEmailHtml({ name, loginUrl }: { name?: string; loginUrl: string }): string {
  const saudacao = name ? `Olá, ${escapeHtml(name)}. ` : ''
  return renderEmailLayout({
    preheader: 'A senha da sua conta Solentis foi alterada.',
    eyebrow: 'Segurança',
    heading: 'Sua senha foi alterada',
    intro: `${saudacao}A senha da sua conta Solentis foi alterada com sucesso. Se foi você, está tudo certo — não é preciso fazer mais nada.`,
    ctaLabel: 'Acessar o Solentis',
    ctaUrl: loginUrl,
    note: 'Se você NÃO fez essa alteração, redefina sua senha imediatamente e avise o responsável pela sua planta.',
  })
}
