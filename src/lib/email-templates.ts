/**
 * Templates de e-mail transacional do Solentis — identidade única e compatível
 * com clientes de e-mail (Gmail, Outlook, Apple Mail, Yahoo, Android, iOS).
 *
 * Esta camada é SÓ apresentação: não altera lógica de envio, tokens, URLs ou auth.
 * Os links/dados chegam prontos de quem chama (actions). Aqui só montamos o HTML.
 *
 * Técnicas de e-mail usadas:
 *  - documento HTML completo com <head> (viewport, color-scheme, media query mobile);
 *  - layout em TABELAS com role="presentation" e estilos INLINE;
 *  - botão à prova de Outlook via `mso-padding-alt` (padding no <td>, que o Word respeita);
 *  - pilha de fontes do sistema (webfont em e-mail é instável);
 *  - logo por URL hospedada (data: URI é bloqueado em muitos clientes);
 *  - preheader oculto (texto de prévia na caixa de entrada);
 *  - sem JavaScript, sem CSS que quebre no Outlook, sem dependências externas.
 */

const BRAND = {
  name: 'Solentis',
  // Teal/cyan da logo — único acento "forte"; o resto fica neutro e elegante.
  primary: '#0e7490', // cyan-700 — botão (bom contraste com texto branco)
  accent: '#06b6d4', // cyan-500 — detalhes finos
  ink: '#0f172a', // slate-900 — títulos
  body: '#475569', // slate-600 — corpo do texto
  muted: '#94a3b8', // slate-400 — rodapé / secundário
  ground: '#eef1f5', // fundo discreto (leve viés frio)
  card: '#ffffff',
  border: '#e6eaef',
  pill: '#f4f6f8',
}

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

export const EMAIL_SUBJECTS = {
  invite: 'Você foi convidado para o Solentis',
  emailConfirmation: 'Confirme seu e-mail — Solentis',
  reset: 'Redefina sua senha — Solentis',
  passwordChanged: 'Sua senha do Solentis foi alterada',
  emailChange: 'Confirme seu novo e-mail — Solentis',
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
  title: string
  /** Mensagem curta (HTML; dado do usuário deve vir já escapado). */
  message: string
  ctaLabel: string
  ctaUrl: string
  /** Informação complementar (prazo, aviso de segurança…). */
  complement?: string
  /** Mostra o bloco "copie e cole este link" (padrão: true). */
  showFallbackLink?: boolean
}

function renderEmailLayout(p: EmailLayoutParams): string {
  const logo = `${baseUrl()}/icons/icon-192x192.png`
  const ctaUrl = escapeHtml(p.ctaUrl)
  const year = new Date().getFullYear()
  const showFallback = p.showFallbackLink !== false

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${escapeHtml(p.title)}</title>
  <!--[if mso]><style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
  <style>
    body{margin:0;padding:0;width:100% !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:${BRAND.ground};}
    table{border-collapse:collapse;}
    img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    a{text-decoration:none;}
    @media only screen and (max-width:620px){
      .sol-card{width:100% !important;border-radius:0 !important;border-left:0 !important;border-right:0 !important;}
      .sol-pad{padding-left:26px !important;padding-right:26px !important;}
      .sol-title{font-size:21px !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.ground};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(p.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.ground};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="sol-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;">

          <!-- Logo -->
          <tr>
            <td class="sol-pad" align="center" style="padding:40px 48px 8px;">
              <img src="${logo}" width="54" height="54" alt="Solentis" style="display:block;border-radius:12px;" />
              <div style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:.4px;color:${BRAND.ink};margin-top:12px;">Solentis</div>
            </td>
          </tr>

          <!-- Título + mensagem -->
          <tr>
            <td class="sol-pad" align="center" style="padding:20px 48px 0;">
              <h1 class="sol-title" style="margin:0 0 14px;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${escapeHtml(p.title)}</h1>
              <p style="margin:0 auto;max-width:420px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BRAND.body};">${p.message}</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="sol-pad" align="center" style="padding:30px 48px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${BRAND.primary}" style="border-radius:8px;mso-padding-alt:15px 34px;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:14px;font-weight:700;letter-spacing:.6px;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(p.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${p.complement ? `<tr>
            <td class="sol-pad" align="center" style="padding:24px 48px 0;">
              <p style="margin:0 auto;max-width:420px;font-family:${FONT};font-size:13px;line-height:1.6;color:${BRAND.muted};">${p.complement}</p>
            </td>
          </tr>` : ''}

          ${showFallback ? `<tr>
            <td class="sol-pad" align="center" style="padding:20px 48px 0;">
              <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;color:${BRAND.muted};">Ou copie e cole este link no navegador:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${BRAND.pill}" style="background:${BRAND.pill};border:1px solid ${BRAND.border};border-radius:8px;padding:11px 14px;font-family:${FONT};font-size:12px;word-break:break-all;text-align:center;">
                    <a href="${ctaUrl}" target="_blank" style="color:${BRAND.primary};text-decoration:none;">${ctaUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Divisor + rodapé -->
          <tr>
            <td class="sol-pad" style="padding:36px 48px 32px;">
              <div style="border-top:1px solid ${BRAND.border};"></div>
              <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                <strong style="color:${BRAND.body};">Solentis</strong> — Gestão operacional e ambiental<br/>
                Este é um e-mail automático. Por favor, não responda a esta mensagem.<br/>
                &copy; ${year} Solentis — Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Convite de novo usuário (define a própria senha). TTL 7 dias. ────────────
export function inviteEmailHtml({ name, url }: { name: string; url: string }): string {
  return renderEmailLayout({
    preheader: 'Você recebeu um convite para acessar o Solentis.',
    title: 'Você foi convidado para o Solentis',
    message: `Olá, ${escapeHtml(name)}. Você recebeu um convite para acessar o Solentis. Clique no botão abaixo para configurar sua conta e começar a utilizar a plataforma.`,
    ctaLabel: 'ACEITAR CONVITE',
    ctaUrl: url,
    complement: 'Por segurança, este convite expira em 7 dias. Se você não esperava este e-mail, pode ignorá-lo.',
  })
}

// ─── Redefinição de senha (link de reset). TTL 60 min. ────────────────────────
export function passwordResetEmailHtml({ url }: { url: string }): string {
  return renderEmailLayout({
    preheader: 'Redefina a senha da sua conta Solentis.',
    title: 'Redefina sua senha',
    message: 'Recebemos uma solicitação para redefinir a senha da sua conta Solentis. Clique abaixo para criar uma nova senha.',
    ctaLabel: 'REDEFINIR SENHA',
    ctaUrl: url,
    complement: 'O link é válido por 60 minutos e pode ser usado apenas uma vez. Se você não solicitou isso, ignore este e-mail — sua senha permanece a mesma.',
  })
}

// ─── Confirmação de senha alterada (aviso de segurança, sem ação obrigatória). ─
export function passwordChangedEmailHtml({ name, loginUrl }: { name?: string; loginUrl: string }): string {
  const saudacao = name ? `Olá, ${escapeHtml(name)}. ` : ''
  return renderEmailLayout({
    preheader: 'A senha da sua conta Solentis foi alterada.',
    title: 'Sua senha foi alterada',
    message: `${saudacao}A senha da sua conta Solentis foi alterada recentemente.`,
    ctaLabel: 'ACESSAR O SOLENTIS',
    ctaUrl: loginUrl,
    complement: 'Se você não realizou essa alteração, entre em contato com o responsável pelo sistema.',
    showFallbackLink: false,
  })
}

// ─── Templates prontos para fluxos FUTUROS (ainda não há envio no app). ───────
// Mantidos aqui para padronização visual; nenhuma lógica de envio foi adicionada.

/** Confirmação de cadastro / e-mail (quando um fluxo de verificação existir). */
export function emailConfirmationHtml({ name, url }: { name?: string; url: string }): string {
  const saudacao = name ? `Olá, ${escapeHtml(name)}. ` : ''
  return renderEmailLayout({
    preheader: 'Confirme seu e-mail para concluir seu cadastro no Solentis.',
    title: 'Confirme seu e-mail',
    message: `${saudacao}Para concluir seu cadastro no Solentis, confirme seu endereço de e-mail clicando no botão abaixo.`,
    ctaLabel: 'CONFIRMAR E-MAIL',
    ctaUrl: url,
    complement: 'Se você não criou uma conta no Solentis, pode ignorar este e-mail.',
  })
}

/** Confirmação de alteração de e-mail (quando um fluxo de troca de e-mail existir). */
export function emailChangeHtml({ name, url }: { name?: string; url: string }): string {
  const saudacao = name ? `Olá, ${escapeHtml(name)}. ` : ''
  return renderEmailLayout({
    preheader: 'Confirme o seu novo endereço de e-mail no Solentis.',
    title: 'Confirme seu novo e-mail',
    message: `${saudacao}Recebemos uma solicitação para alterar o e-mail da sua conta Solentis. Confirme o novo endereço clicando no botão abaixo.`,
    ctaLabel: 'CONFIRMAR E-MAIL',
    ctaUrl: url,
    complement: 'Se você não solicitou essa alteração, ignore este e-mail e avise o responsável pelo sistema.',
  })
}
