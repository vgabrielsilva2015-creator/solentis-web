import { test, expect, type Page, type Browser } from '@playwright/test';

// Regressão da Fase 2 — fluxo completo do operador, ponta a ponta, em dois
// navegadores separados (sainte e entrante):
//   abrir turno → leitura com vírgula → iniciar passagem → sair →
//   entrante vê a passagem → confirma → turno fechado com a leitura no checklist.
// Pré-condição (harness): os dois operadores sem turno ativo; operador2 existe.
const OP1 = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };
const OP2 = { email: process.env.E2E_OPERADOR2_EMAIL ?? 'operador2@solentis.local', pass: process.env.E2E_OPERADOR2_SENHA ?? 'Operador@123' };

async function novaSessao(browser: Browser, u: { email: string; pass: string }): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.startsWith('/operador'));
  return page;
}

test('fluxo completo: turno, leitura, passagem e confirmação', async ({ browser }) => {
  test.setTimeout(150_000);
  const marca = `fase2-${Date.now()}`;

  // ── Operador 1 abre o turno sugerido para o horário atual ─────────────────
  const p1 = await novaSessao(browser, OP1);
  await p1.goto('/operador/turnos/abrir');
  await expect(p1.locator('input[name="shift_id"]:checked')).toHaveCount(1); // há um sugerido
  await p1.getByRole('button', { name: /confirmar abertura/i }).click();
  await p1.waitForURL('**/operador/dashboard', { timeout: 20_000 });

  // ── Registra uma leitura com vírgula ─────────────────────────────────────
  await p1.goto('/operador/leituras/novo');
  await p1.locator('form:has(input[name="collection_point_id"]) button[type="button"]').first().click();
  await p1.getByRole('button', { name: /pH/i }).first().click();
  await p1.fill('input[name="value"]', '7,4');
  await p1.fill('textarea[name="notes"]', marca);
  await p1.getByRole('button', { name: /registrar leitura/i }).click();
  await p1.waitForURL('**/operador/leituras', { timeout: 20_000 });

  // ── Inicia a passagem do próprio turno ───────────────────────────────────
  await p1.goto('/operador/turnos');
  await p1.getByRole('link', { name: /iniciar passagem de turno/i }).first().click();
  await p1.waitForURL(/\/operador\/turnos\/[^/]+\/passagem/);
  const instanceId = p1.url().split('/turnos/')[1].split('/')[0];
  await p1.fill('textarea[name="pending_items"]', `pendência ${marca}`);
  await p1.fill('textarea[name="outgoing_observations"]', `turno tranquilo ${marca}`);
  await p1.check('input[name="confirm"]');
  await p1.locator('main form button[type="submit"]').click();
  await p1.waitForURL('**/operador/turnos', { timeout: 20_000 });

  // o sainte não confirma a própria passagem
  await expect(p1.getByRole('link', { name: /confirmar recebimento/i })).toHaveCount(0);
  await p1.getByRole('button', { name: /sair/i }).click();
  await p1.waitForURL('**/login');

  // ── Operador 2 recebe ────────────────────────────────────────────────────
  const p2 = await novaSessao(browser, OP2);
  await p2.goto('/operador/dashboard');
  await expect(p2.getByText(/passage(m|ns) de turno aguardando sua confirmação/i)).toBeVisible();
  await p2.goto('/operador/turnos');
  const card = p2.locator('div.rounded-xl', { hasText: `pendência ${marca}` });
  await expect(card).toBeVisible();
  await expect(card.getByText(/1 leitura\(s\) no turno/)).toBeVisible(); // a leitura entrou no turno do sainte (P-16)
  await card.getByRole('link', { name: /confirmar recebimento/i }).click();
  await p2.waitForURL('**/operador/turnos/confirmar**');
  await p2.fill('textarea[name="incoming_observations"]', `recebido ${marca}`);
  await p2.getByText(/não iniciar turno agora/i).click();
  await p2.locator('main form button[type="submit"]').click();
  // sai da tela de confirmação (a página redireciona para Turnos ao ver a
  // passagem confirmada; o formulário empurraria para o dashboard)
  await p2.waitForURL(/\/operador\/(dashboard|turnos)$/, { timeout: 20_000 });

  // a passagem saiu da lista
  await p2.goto('/operador/turnos');
  await expect(p2.locator('div.rounded-xl', { hasText: `pendência ${marca}` })).toHaveCount(0);

  // ── Histórico mostra a leitura com o valor digitado ──────────────────────
  await p2.goto('/operador/leituras/historico');
  await expect(p2.getByText(marca)).toBeVisible();

  // id do turno fica disponível para a checagem de banco do runner
  console.log(`FASE2_INSTANCE=${instanceId}`);
});
