import { test, expect, type Page } from '@playwright/test';

// T-11 — trocar a senha exige a senha atual. O teste troca a senha do técnico e
// devolve a original no final (não deixa o banco diferente).
const EMAIL = process.env.E2E_TECNICO_EMAIL ?? 'tecnico@solentis.local';
const ORIGINAL = process.env.E2E_TECNICO_SENHA ?? 'Tecnico@123';
const TEMP = 'TrocaTeste2026x';

async function login(page: Page, senha: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', senha);
  await page.click('button[type="submit"]');
}

async function trocar(page: Page, atual: string, nova: string) {
  await page.goto('/trocar-senha');
  await page.fill('input[name="currentPassword"]', atual);
  await page.fill('input[name="newPassword"]', nova);
  await page.fill('input[name="confirmPassword"]', nova);
  await page.getByRole('button', { name: /salvar nova senha/i }).click();
}

test.describe.serial('T-11 - troca de senha', () => {
  test('sem a senha atual correta, a senha não muda', async ({ page }) => {
    await login(page, ORIGINAL);
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await trocar(page, 'senha-errada-123', TEMP);
    await expect(page.getByText('Senha atual incorreta')).toBeVisible();
    // a senha original continua valendo
    await page.context().clearCookies();
    await login(page, ORIGINAL);
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  });

  test('com a senha atual: troca, a antiga deixa de valer, e volta à original', async ({ page }) => {
    await login(page, ORIGINAL);
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await trocar(page, ORIGINAL, TEMP);
    await page.waitForURL((u) => !u.pathname.startsWith('/trocar-senha'), { timeout: 20000 });

    await page.context().clearCookies();
    await login(page, ORIGINAL);
    await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible();

    await login(page, TEMP);
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await trocar(page, TEMP, ORIGINAL); // restaura
    await page.waitForURL((u) => !u.pathname.startsWith('/trocar-senha'), { timeout: 20000 });
  });
});
