/**
 * Modelos de e-mail transacional (convite e redefinição de senha).
 *
 * T-21 (V-12): todo texto que vem de gente (nome do usuário) passa por
 * `escapeHtml`; a URL passa por `safeUrl` (só http/https). Nenhuma action monta
 * HTML na mão.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/** Só http(s). Qualquer outra coisa (javascript:, data:) vira '#'. */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? escapeHtml(u.toString()) : '#'
  } catch {
    return '#'
  }
}

export interface RenderedEmail { subject: string; html: string }

const FONT_TEXT = "'IBM Plex Sans','Segoe UI',Helvetica,Arial,sans-serif"
const FONT_TITLE = "'Sora','Segoe UI',Helvetica,Arial,sans-serif"

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000')
}

interface Layout {
  preheader: string
  eyebrow: string
  title: string
  paragraphs: string[]   // já com HTML seguro (texto de usuário passa por escapeHtml antes)
  buttonLabel: string
  url: string
  email?: string
  emailLabel?: string
  notice?: { title: string; text: string }
  footer: string[]
}

/** Layout único dos e-mails: tabelas e estilos inline (Gmail/Outlook), cores da marca Solentis. */
function layout(o: Layout): string {
  const href = safeUrl(o.url)
  const site = baseUrl()
  const emailBox = o.email ? `
                <tr><td style="padding:24px 48px 0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f8fa;border:1px solid #dcebf0;border-radius:12px;">
                    <tr><td style="padding:14px 18px;font-family:${FONT_TEXT};">
                      <span style="display:block;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6b838d;">${escapeHtml(o.emailLabel ?? 'Conta')}</span>
                      <span style="display:block;font-size:15px;line-height:22px;font-weight:600;color:#0c2a36;word-break:break-all;">${escapeHtml(o.email)}</span>
                    </td></tr>
                  </table>
                </td></tr>` : ''
  const notice = o.notice ? `
                <tr><td style="padding:16px 48px 0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff8e8;border:1px solid #f3e2b3;border-radius:12px;">
                    <tr><td style="padding:14px 18px;font-family:${FONT_TEXT};font-size:14px;line-height:21px;color:#6a5316;">
                      <strong style="color:#4f3d0e;">${escapeHtml(o.notice.title)}</strong> ${escapeHtml(o.notice.text)}
                    </td></tr>
                  </table>
                </td></tr>` : ''
  const paragraphs = o.paragraphs.map((p, i) =>
    `<p style="margin:0 0 ${i === o.paragraphs.length - 1 ? 28 : 12}px 0;font-size:16px;line-height:26px;color:#3d5560;">${p}</p>`).join('\n                    ')
  const footer = o.footer.map((f) =>
    `<p style="margin:0 0 8px 0;font-size:13px;line-height:20px;color:#58707a;">${escapeHtml(f)}</p>`).join('\n              ')
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(o.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eaf2f4;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#eaf2f4;opacity:0;">${escapeHtml(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eaf2f4;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr><td align="center" style="padding:0 0 20px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-right:12px;"><img src="${escapeHtml(site)}/email/solentis-logo.png" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border-radius:11px;background-color:#1aa6b7;"></td>
            <td valign="middle" style="font-family:${FONT_TITLE};font-size:24px;line-height:28px;font-weight:700;letter-spacing:-0.3px;color:#0c2a36;">Solentis</td>
          </tr></table>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:20px;border:1px solid #d6e5ea;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td height="6" style="height:6px;line-height:6px;font-size:0;background-color:#1aa6b7;background-image:linear-gradient(90deg,#3ad0d6 0%,#0a86a0 100%);border-radius:20px 20px 0 0;">&nbsp;</td></tr>
            <tr><td style="padding:40px 48px 8px 48px;font-family:${FONT_TEXT};">
              <p style="margin:0 0 16px 0;font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#0a86a0;">${escapeHtml(o.eyebrow)}</p>
              <h1 style="margin:0 0 16px 0;font-family:${FONT_TITLE};font-size:28px;line-height:36px;font-weight:700;letter-spacing:-0.5px;color:#0c2a36;">${escapeHtml(o.title)}</h1>
                    ${paragraphs}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;"><tr>
                <td align="center" bgcolor="#0a86a0" style="border-radius:12px;background-color:#0a86a0;background-image:linear-gradient(135deg,#1aa6b7 0%,#0a86a0 100%);">
                  <a href="${href}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:${FONT_TEXT};font-size:16px;line-height:22px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(o.buttonLabel)} &nbsp;&rarr;</a>
                </td>
              </tr></table>
            </td></tr>${emailBox}${notice}
            <tr><td style="padding:32px 48px 40px 48px;font-family:${FONT_TEXT};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:0;background-color:#e3eef2;">&nbsp;</td></tr></table>
              <p style="margin:20px 0 6px 0;font-size:13px;line-height:20px;color:#6b838d;">O botão não funciona? Copie e cole este endereço no navegador:</p>
              <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${href}" target="_blank" style="color:#0a86a0;text-decoration:underline;">${href}</a></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 24px 0 24px;font-family:${FONT_TEXT};">
              ${footer}
              <p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#8aa0a9;">Solentis</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function inviteEmail({ name, url, email }: { name: string; url: string; email?: string }): RenderedEmail {
  return {
    subject: 'Convite — Solentis',
    html: layout({
      preheader: 'Aceite o convite e crie seu acesso ao Solentis.',
      eyebrow: 'Convite de acesso',
      title: 'Você foi convidado para o Solentis',
      paragraphs: [
        `Olá, ${escapeHtml(name)}. Uma conta foi criada para você no Solentis, a plataforma de gestão da estação de tratamento.`,
        'Clique no botão abaixo para definir sua senha e acessar. O link é válido por <strong>7 dias</strong>.',
      ],
      buttonLabel: 'Definir minha senha',
      url, email, emailLabel: 'Convite para',
      footer: [
        'Não esperava este convite? Pode ignorar este e-mail: nenhuma conta será ativada sem o seu aceite.',
        'O link é pessoal e funciona uma única vez. Não o encaminhe a outras pessoas.',
      ],
    }),
  }
}

export function resetPasswordEmail({ url, email }: { url: string; email?: string }): RenderedEmail {
  return {
    subject: 'Redefinição de senha — Solentis',
    html: layout({
      preheader: 'Recebemos um pedido para redefinir a senha da sua conta no Solentis.',
      eyebrow: 'Redefinição de senha',
      title: 'Vamos criar uma nova senha',
      paragraphs: [
        'Recebemos um pedido para redefinir a senha da sua conta no Solentis.',
        'Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>60 minutos</strong>.',
      ],
      buttonLabel: 'Redefinir senha',
      url, email, emailLabel: 'Conta',
      notice: { title: 'Não foi você?', text: 'Ignore este e-mail. Sua senha atual continua valendo e nada será alterado sem o clique no botão.' },
      footer: ['O link é pessoal, tem validade limitada e funciona uma única vez. Não o encaminhe a outras pessoas.'],
    }),
  }
}
