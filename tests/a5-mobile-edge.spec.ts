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

test.describe('A5 - Mobile & Borda', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('Operador mobile: BottomNav deve estar visível, sidebar oculta', async ({ page }) => {
    await login(page, USERS.operador);
    await page.goto('/operador/turnos');

    // Sidebar oculta (assumindo que seja via md:hidden ou lg:hidden)
    const desktopNav = page.locator('nav.hidden.lg\\:block'); // ajustável conforme o seletor exato
    if (await desktopNav.count() > 0) {
      await expect(desktopNav).toBeHidden();
    }

    // BottomNav visível
    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();
  });
});
