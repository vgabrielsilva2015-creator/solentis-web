/** T-21 (V-12): o HTML dos e-mails não pode ser alterado pelo que o usuário digita. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { escapeHtml, safeUrl, inviteEmail, resetPasswordEmail } from '@/lib/email-templates'

const URL_OK = 'https://app.solentis.com.br/reset?token=abc123'

describe('escapeHtml / safeUrl', () => {
  it('escapa os cinco caracteres perigosos', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;')
  })
  it.each(['javascript:alert(1)', 'data:text/html,<b>', 'não é url', ''])('URL %j vira #', (u) => {
    expect(safeUrl(u)).toBe('#')
  })
  it('mantém http(s) e escapa aspas na URL', () => {
    expect(safeUrl(URL_OK)).toBe(URL_OK)
    expect(safeUrl('https://a.com/?q="x"')).not.toContain('"x"')
  })
})

describe('e-mail de convite', () => {
  it('nome com HTML não vira HTML (era V-12: link/HTML injetado com o remetente oficial)', () => {
    const { html } = inviteEmail({ name: `<a href="https://golpe.example">Clique aqui</a><img src=x onerror=1>`, url: URL_OK })
    expect(html).not.toContain('<a href="https://golpe.example"')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;a href=&quot;https://golpe.example&quot;&gt;')
  })
  it('o único link do e-mail é o do convite', () => {
    const { html } = inviteEmail({ name: 'Maria', url: URL_OK })
    expect([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).every((h) => h === URL_OK || h.startsWith('https://'))).toBe(true)
    expect(html).toContain(URL_OK)
  })
  it('URL de esquema perigoso não vira link', () => {
    expect(inviteEmail({ name: 'M', url: 'javascript:alert(1)' }).html).not.toContain('javascript:')
  })
})

describe('e-mail de redefinição', () => {
  it('traz o link e não aceita esquema perigoso', () => {
    expect(resetPasswordEmail({ url: URL_OK }).html).toContain(URL_OK)
    expect(resetPasswordEmail({ url: 'javascript:1' }).html).not.toContain('javascript:')
  })
})

describe('nenhuma action monta HTML de e-mail na mão', () => {
  const ARQUIVOS = ['app/gestor/(sistema)/usuarios/actions.ts', 'app/admin/plantas/actions.ts', 'app/(auth)/actions.ts']
  it.each(ARQUIVOS)('%s usa email-templates', (rel) => {
    const t = readFileSync(join(process.cwd(), 'src', rel), 'utf-8')
    expect(t).not.toMatch(/const html = `/)
    expect(t).toMatch(/email-templates/)
  })
})
