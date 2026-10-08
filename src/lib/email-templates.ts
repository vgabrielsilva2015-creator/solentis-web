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

export function inviteEmail({ name, url }: { name: string; url: string }): RenderedEmail {
  const href = safeUrl(url)
  const html = `
        <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2 style="margin-bottom: 16px;">Você foi convidado para o Solentis</h2>
          <p>Olá, ${escapeHtml(name)}. Uma conta foi criada para você no Solentis.</p>
          <p>Clique no botão abaixo para definir sua senha e acessar. O link é válido por <strong>7 dias</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${href}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
              Definir minha senha
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">Se você não esperava este convite, ignore este e-mail.</p>
        </div>
      `
  return { subject: 'Convite — Solentis', html }
}

export function resetPasswordEmail({ url }: { url: string }): RenderedEmail {
  const href = safeUrl(url)
  const html = `
      <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2 style="margin-bottom: 16px;">Redefinição de senha — Solentis</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>60 minutos</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${href}" style="background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
            Redefinir senha
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">Se você não solicitou isso, ignore este e-mail — sua senha continua a mesma.</p>
      </div>
    `
  return { subject: 'Redefinição de senha — Solentis', html }
}
