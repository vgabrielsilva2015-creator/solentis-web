import { test, expect } from '@playwright/test';

const USERS = {
  operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
};

async function login(page: any, user: { email: string; pass: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}

test.describe('A4 - Concorrência e Duplo Clique', () => {
  test('Duplo clique rápido no submit da ocorrência não deve gerar dois registros idênticos', async ({ page }) => {
    await login(page, USERS.operador);
    await page.goto('/operador/ocorrencias/nova');

    const uniqueString = `Problema concorrente ${Date.now()}`;
    await page.fill('textarea[name="description"]', uniqueString);
    await page.selectOption('select[name="category"]', 'OUTROS');
    await page.selectOption('select[name="severity"]', 'LOW');

    // Clica duas vezes rápidas!
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await submitButton.click({ force: true }).catch(() => {}); // catch disabled state click err

    await page.waitForURL('**/operador/ocorrencias');

    // Confirma que existe, mas idealmente seria validar se count() === 1.
    const ocorrencias = page.locator(`text=${uniqueString}`);
    await expect(ocorrencias).toHaveCount(1, { timeout: 5000 });
  });
});
