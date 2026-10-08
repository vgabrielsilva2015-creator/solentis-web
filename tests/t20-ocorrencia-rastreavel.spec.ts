import { test, expect, type Browser, type Page } from '@playwright/test';

// T-20 — decisões do dono: Manutenção registra ocorrência; operador resolve,
// e toda resolução fica registrada com responsável, data/hora e a ação tomada.
const MAN = { email: process.env.E2E_MANUTENCAO_EMAIL ?? 'manutencao@solentis.local', pass: process.env.E2E_MANUTENCAO_SENHA ?? 'Manutencao@123' };
const OP = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };

async function entrar(browser: Browser, u: { email: string; pass: string }, area: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.startsWith(area));
  return page;
}

test('manutenção registra, operador resolve com a ação descrita, e fica o registro', async ({ browser }) => {
  test.setTimeout(120_000);
  const marca = `t20-${Date.now()}`;

  // ── Manutenção registra pela área dela ──────────────────────────────────
  const m = await entrar(browser, MAN, '/manutencao');
  await m.getByRole('link', { name: /^ocorrências$/i }).locator('visible=true').first().click();
  await m.waitForURL('**/manutencao/ocorrencias');
  await m.getByRole('link', { name: /nova ocorrência/i }).click();
  await m.fill('textarea[name="description"]', `Vazamento na gaxeta da bomba ${marca}`);
  await m.selectOption('select[name="type"]', 'EQUIPMENT');
  await m.selectOption('select[name="category"]', 'VAZAMENTO');
  await m.selectOption('select[name="severity"]', 'LOW');
  await m.locator('form button[type="submit"]').last().click();
  await m.waitForURL('**/manutencao/ocorrencias', { timeout: 20_000 });
  await expect(m.getByText(`Vazamento na gaxeta da bomba ${marca}`)).toBeVisible();

  // ── Operador resolve pela tela de detalhe ───────────────────────────────
  const o = await entrar(browser, OP, '/operador');
  // o operador chega pela busca (a lista dele mostra só as que ele mesmo registrou)
  const busca = await (await o.request.get(`/api/search?q=${encodeURIComponent(marca)}`)).json();
  const hit = (busca.results ?? busca).find((h: { href: string }) => h.href.startsWith('/operador/ocorrencias/'));
  expect(hit, 'a ocorrência aparece na busca do operador').toBeTruthy();
  await o.goto(hit.href);
  const campo = o.locator('textarea[name="resolution_notes"]');
  await expect(campo).toBeVisible();
  // texto curto: o navegador barra (minLength) e nada é gravado
  await campo.fill('ok');
  await o.getByRole('button', { name: /confirmar resolução/i }).click();
  expect(await campo.evaluate((el) => (el as HTMLTextAreaElement).validity.tooShort)).toBe(true);
  await campo.fill(`Troquei a gaxeta e testei por 10 minutos ${marca}`);
  await o.getByRole('button', { name: /confirmar resolução/i }).click();

  // a linha do tempo mostra a resolução, com a ação e quem resolveu
  await expect(o.getByText(/ocorrência resolvida/i)).toBeVisible({ timeout: 15_000 });
  await expect(o.getByText(`Troquei a gaxeta e testei por 10 minutos ${marca}`)).toBeVisible();
  await expect(o.locator('textarea[name="resolution_notes"]')).toHaveCount(0);

  // ── Manutenção vê quem resolveu ─────────────────────────────────────────
  await m.reload();
  await expect(m.getByText(new RegExp(`Resolvida por .+: Troquei a gaxeta e testei por 10 minutos ${marca}`))).toBeVisible();
});
