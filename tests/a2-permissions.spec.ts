import { test, expect } from '@playwright/test';

const USERS = {
  operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
  tecnico: { email: 'tecnico@solentis.local', pass: 'Tecnico@123' },
};

async function login(page: any, user: { email: string; pass: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}

test.describe('A2 - Permissões e Segurança', () => {
  test('Operador não deve acessar rotas de gestor', async ({ page }) => {
    await login(page, USERS.operador);
    await page.goto('/gestor/dashboard');
    // Deve redirecionar para acesso negado ou NotFound, ou barrar
    const content = await page.textContent('body');
    expect(content).toContain('Acesso Restrito'); // Ou a mensagem do acesso negado
  });

  test('Técnico não deve acessar rotas de admin', async ({ page }) => {
    await login(page, USERS.tecnico);
    await page.goto('/admin/plantas');
    const content = await page.textContent('body');
    expect(content).toContain('Acesso Restrito');
  });

  test('Usuário deslogado redirecionado para o login', async ({ page }) => {
    await page.goto('/gestor/dashboard');
    expect(page.url()).toContain('/login');
  });

  test('Rota inexistente (xpto) mostra erro 404 customizado', async ({ page }) => {
    const response = await page.goto('/xpto');
    expect(response?.status()).toBe(404);
    const content = await page.textContent('body');
    expect(content).toContain('Página não encontrada');
  });
});
