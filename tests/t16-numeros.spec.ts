import { test, expect, type Page } from '@playwright/test';

// T-16 — números digitados com vírgula funcionam na tela (antes: erro em inglês
// na leitura e 2,5 virava 2 no estoque).
const OPERADOR = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', OPERADOR.email);
  await page.fill('input[name="password"]', OPERADOR.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith('/operador'));
}

test('leitura com vírgula: aceita, marca o limite na hora e grava', async ({ page }) => {
  await login(page);
  const nota = `t16-ui-${Date.now()}`;
  await page.goto('/operador/leituras/novo');
  await page.locator('form:has(input[name="collection_point_id"]) button[type="button"]').first().click();
  await page.getByRole('button', { name: /pH/i }).first().click();
  await page.fill('input[name="value"]', '14,5'); // fora do limite de pH
  await expect(page.getByText(/fora do limite/i).first()).toBeVisible();
  await page.fill('input[name="value"]', '7,2');
  await expect(page.getByText(/fora do limite/i)).toHaveCount(0);
  await page.fill('textarea[name="notes"]', nota);
  await page.getByRole('button', { name: /registrar leitura/i }).evaluate((b) => (b as HTMLButtonElement).click());
  await page.waitForURL('**/operador/leituras', { timeout: 15000 });
  await page.goto('/operador/leituras/historico');
  await expect(page.getByText(nota)).toBeVisible();
});

test('valor inválido: o navegador barra o formato e o servidor responde em português', async ({ page }) => {
  await login(page);
  await page.goto('/operador/leituras/novo');
  await page.locator('form:has(input[name="collection_point_id"]) button[type="button"]').first().click();
  await page.getByRole('button', { name: /pH/i }).first().click();
  const campo = page.locator('input[name="value"]');
  await campo.fill('7,2,1');
  expect(await campo.evaluate((i) => (i as HTMLInputElement).validity.patternMismatch)).toBe(true);
  // "." passa pelo filtro do navegador e chega ao servidor
  await campo.fill('.');
  await page.getByRole('button', { name: /registrar leitura/i }).evaluate((b) => (b as HTMLButtonElement).click());
  await expect(page.getByText(/número inválido/i)).toBeVisible();
  await expect(page.getByText(/expected|invalid input|received/i)).toHaveCount(0);
});

test('saída de estoque com vírgula: o campo aceita "2,5"', async ({ page }) => {
  await login(page);
  await page.goto('/operador/estoque');
  const link = page.locator('a[href^="/operador/estoque/"][href$="/saida"]').first();
  test.skip(!(await link.count()), 'sem produto com saída disponível');
  await link.click();
  const campo = page.locator('input[name="quantity"]');
  await campo.fill('2,5');
  await expect(campo).toHaveValue('2,5'); // com type="number" o navegador descartava a vírgula
});
